import os
import json
import re
import io
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

# PDF & DOCX parsing
import PyPDF2
import docx

# NLP & ML
import spacy
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Generative AI & Environment
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
AI_API_KEY = os.getenv("AI_API_KEY")
if AI_API_KEY:
    ai_client = Groq(api_key=AI_API_KEY)

# ── App Setup ────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

import tempfile

UPLOAD_FOLDER = os.path.join(tempfile.gettempdir(), 'resume_uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10 MB

ALLOWED_EXT = {'pdf', 'docx', 'txt'}

# ── Load spaCy model (en_core_web_sm) ────────────────────────────────────────
try:
    import en_core_web_sm
    nlp = en_core_web_sm.load()
except ImportError:
    try:
        nlp = spacy.load('en_core_web_sm')
    except OSError:
        from spacy.cli import download as spacy_download
        spacy_download('en_core_web_sm')
        nlp = spacy.load('en_core_web_sm')

# ── Skill Taxonomy ────────────────────────────────────────────────────────────
SKILL_TAXONOMY = [
    # Programming Languages
    "python","java","javascript","typescript","c++","c#","ruby","go","rust",
    "swift","kotlin","r","scala","perl","php","matlab","sql","bash","shell",
    # Web
    "html","css","react","angular","vue","node","express","django","flask",
    "fastapi","spring","bootstrap","tailwind","graphql","rest","api",
    # Data / ML / AI
    "machine learning","deep learning","nlp","natural language processing",
    "computer vision","tensorflow","pytorch","keras","scikit-learn","pandas",
    "numpy","matplotlib","seaborn","power bi","tableau","excel","data analysis",
    "feature engineering","model training","neural network","bert","gpt",
    "transformers","opencv","yolo","regression","classification","clustering",
    # Cloud / DevOps
    "aws","azure","gcp","google cloud","docker","kubernetes","jenkins","ci/cd",
    "terraform","ansible","linux","git","github","gitlab","bitbucket",
    # Databases
    "mysql","postgresql","mongodb","sqlite","redis","elasticsearch","firebase",
    "supabase","oracle","cassandra","dynamodb",
    # Other
    "agile","scrum","jira","communication","leadership","problem solving",
    "critical thinking","teamwork","project management","testing","selenium",
    "junit","pytest","postman",
]

# ── Job Title → Skill Mapping (for short/simple JD auto-expansion) ───────────
JOB_TITLE_SKILLS_MAP = [
    # Each entry: (list of trigger keywords, expanded JD text with taxonomy skills)
    (
        ["software developer", "software engineer", "swe", "full stack", "fullstack", "backend developer", "backend engineer"],
        "We are looking for a Software Developer. Required skills: python, javascript, sql, flask, django, react, node, "
        "rest, api, git, github, mysql, postgresql, mongodb, linux, docker, agile, scrum, problem solving, teamwork, communication."
    ),
    (
        ["machine learning", "ml engineer", "ml developer", "ai engineer", "artificial intelligence", "deep learning"],
        "We are looking for a Machine Learning Engineer. Required skills: python, machine learning, deep learning, nlp, "
        "scikit-learn, tensorflow, pytorch, keras, numpy, pandas, feature engineering, regression, classification, "
        "clustering, sql, git, github, docker, aws, communication, problem solving."
    ),
    (
        ["data scientist", "data science", "data analyst", "analytics"],
        "We are looking for a Data Scientist. Required skills: python, pandas, numpy, sql, machine learning, "
        "regression, classification, clustering, scikit-learn, matplotlib, seaborn, tableau, power bi, "
        "excel, data analysis, git, communication, leadership."
    ),
    (
        ["web developer", "frontend developer", "front end", "frontend engineer", "ui developer"],
        "We are looking for a Web Developer. Required skills: html, css, javascript, react, angular, vue, "
        "node, express, rest, api, git, github, bootstrap, tailwind, graphql, mongodb, problem solving, communication."
    ),
    (
        ["devops", "cloud engineer", "site reliability", "sre", "infrastructure engineer"],
        "We are looking for a DevOps Engineer. Required skills: docker, kubernetes, aws, azure, gcp, google cloud, "
        "linux, git, github, jenkins, ci/cd, terraform, ansible, python, bash, shell, monitoring, teamwork, communication."
    ),
    (
        ["android developer", "ios developer", "mobile developer", "app developer", "flutter developer"],
        "We are looking for a Mobile App Developer. Required skills: java, kotlin, swift, python, flutter, react, "
        "git, github, rest, api, firebase, sqlite, agile, scrum, problem solving, teamwork, communication."
    ),
    (
        ["data engineer", "etl", "big data", "database engineer"],
        "We are looking for a Data Engineer. Required skills: python, sql, postgresql, mysql, mongodb, "
        "redis, elasticsearch, aws, azure, docker, spark, git, github, linux, pandas, numpy, communication, teamwork."
    ),
    (
        ["nlp engineer", "nlp developer", "natural language", "text mining", "language model"],
        "We are looking for an NLP Engineer. Required skills: python, nlp, natural language processing, "
        "transformers, bert, gpt, pytorch, tensorflow, scikit-learn, numpy, pandas, machine learning, "
        "deep learning, sql, git, github, communication, problem solving."
    ),
    (
        ["cybersecurity", "security engineer", "penetration", "ethical hacker", "information security"],
        "We are looking for a Cybersecurity Engineer. Required skills: python, bash, shell, linux, git, "
        "networking, testing, sql, aws, docker, communication, problem solving, critical thinking, leadership."
    ),
    (
        ["java developer", "java engineer", "spring developer", "spring boot"],
        "We are looking for a Java Developer. Required skills: java, spring, sql, mysql, postgresql, "
        "rest, api, git, github, docker, junit, testing, agile, scrum, problem solving, teamwork, communication."
    ),
]


def expand_jd(jd_text: str) -> str:
    """If the JD is very short (a job title / a few words), auto-expand it to a
    skill-rich description so the taxonomy matcher can work properly."""
    if len(jd_text.strip()) > 150:
        return jd_text  # Already detailed — use as-is

    jd_lower = jd_text.strip().lower()
    for triggers, expanded in JOB_TITLE_SKILLS_MAP:
        for trigger in triggers:
            if trigger in jd_lower:
                return expanded

    # Fallback: if nothing matched, return original (will still do TF-IDF)
    return jd_text


# ── Utilities ─────────────────────────────────────────────────────────────────
def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXT


def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
    pages = [page.extract_text() or '' for page in reader.pages]
    return '\n'.join(pages)


def extract_text_from_docx(file_bytes: bytes) -> str:
    document = docx.Document(io.BytesIO(file_bytes))
    return '\n'.join(para.text for para in document.paragraphs)


def extract_text(file_bytes: bytes, filename: str) -> str:
    ext = filename.rsplit('.', 1)[1].lower()
    if ext == 'pdf':
        return extract_text_from_pdf(file_bytes)
    elif ext == 'docx':
        return extract_text_from_docx(file_bytes)
    else:  # txt
        return file_bytes.decode('utf-8', errors='ignore')


def preprocess(text: str) -> str:
    """Lowercase, remove special chars, lemmatise via spaCy."""
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s\+\#\.]', ' ', text)
    doc = nlp(text)
    tokens = [
        token.lemma_
        for token in doc
        if not token.is_stop and not token.is_punct and token.is_alpha and len(token.text) > 1
    ]
    return ' '.join(tokens)


def extract_skills(text: str) -> list[str]:
    """Return skills found in text (matched against taxonomy)."""
    text_lower = text.lower()
    found = []
    for skill in SKILL_TAXONOMY:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            found.append(skill)
    return found


def compute_tfidf_similarity(resume_text: str, jd_text: str) -> float:
    """Cosine similarity between resume & JD using TF-IDF."""
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)
    tfidf = vectorizer.fit_transform([resume_text, jd_text])
    score = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
    return round(float(score) * 100, 2)


def compute_skill_match(resume_skills: list, jd_skills: list) -> dict:
    """Compute how many JD skills appear in resume."""
    if not jd_skills:
        return {"score": 0, "matched": [], "missing": []}
    jd_set = set(jd_skills)
    resume_set = set(resume_skills)
    matched = sorted(jd_set & resume_set)
    missing = sorted(jd_set - resume_set)
    score = round(len(matched) / len(jd_set) * 100, 2)
    return {"score": score, "matched": matched, "missing": missing}


def compute_overall_score(skill_score: float, tfidf_score: float) -> float:
    """Weighted combination: 60% skill match + 40% TF-IDF similarity."""
    return round(0.60 * skill_score + 0.40 * tfidf_score, 2)


def get_ai_feedback(resume_skills: list, jd_skills: list, missing_skills: list, score: float) -> str:
    """Gets feedback from Generative AI if available, otherwise returns mock feedback."""
    if not AI_API_KEY:
        return (
            "**API Key Not Configured.**\n"
            "To use live Generative AI insights, create a `.env` file and set `AI_API_KEY=your_key`.\n\n"
            "*Standard Analysis:*\n"
            f"- The candidate shares a **{score}%** match with the required skill set.\n"
            f"- They are missing exactly **{len(missing_skills)}** targeted skills.\n"
            "- Focus your interview on the missing gaps like: " + ", ".join(missing_skills[:3]) + "."
        )
    
    try:
        prompt = (
            f"You are an expert HR Talent Acquisition Specialist. Generate a 3-4 sentence evaluation "
            f"for a candidate whose resume scored {score}% on our matching algorithm. "
            f"They have these skills: {', '.join(resume_skills[:15])}. "
            f"However, they are missing these required skills: {', '.join(missing_skills)}. "
            "Write a brief, professional summary of their fit and what interview questions we should ask them."
        )
        
        completion = ai_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="llama-3.1-8b-instant",
            temperature=0.6,
        )
        
        return completion.choices[0].message.content
    except Exception as e:
        return f"**AI Service Error:** Could not generate feedback at this time. ({str(e)})"

def analyse_resume(resume_text: str, jd_text: str) -> dict:
    """Full analysis pipeline."""
    # Auto-expand short/title-only JD into a full skill-rich description
    jd_text = expand_jd(jd_text)

    clean_resume = preprocess(resume_text)
    clean_jd    = preprocess(jd_text)

    resume_skills = extract_skills(resume_text)
    jd_skills     = extract_skills(jd_text)

    skill_result  = compute_skill_match(resume_skills, jd_skills)
    tfidf_score   = compute_tfidf_similarity(clean_resume, clean_jd)
    overall       = compute_overall_score(skill_result['score'], tfidf_score)

    # Named entities from resume
    doc = nlp(resume_text[:5000])  # cap for speed
    entities = {
        label: list({ent.text for ent in doc.ents if ent.label_ == label})
        for label in ('PERSON', 'ORG', 'GPE', 'DATE')
    }
    
    ai_feedback = get_ai_feedback(resume_skills, jd_skills, skill_result['missing'], overall)

    return {
        "overall_score":      overall,
        "skill_match_score":  skill_result['score'],
        "tfidf_score":        tfidf_score,
        "matched_skills":     skill_result['matched'],
        "missing_skills":     skill_result['missing'],
        "resume_skills":      resume_skills,
        "jd_skills":          jd_skills,
        "entities":           entities,
        "ai_feedback":        ai_feedback
    }

# ── Routes ────────────────────────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/screen', methods=['POST'])
def screen_resume():
    """
    Expects multipart/form-data with:
      - resume: file (pdf/docx/txt)
      - job_description: text string
    Returns JSON analysis result.
    """
    if 'resume' not in request.files:
        return jsonify({"error": "No resume file provided"}), 400

    file = request.files['resume']
    jd_text = request.form.get('job_description', '').strip()

    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "Only PDF, DOCX, or TXT files are allowed"}), 400
    if not jd_text:
        return jsonify({"error": "Job description is required"}), 400

    file_bytes = file.read()
    filename   = secure_filename(file.filename)

    try:
        resume_text = extract_text(file_bytes, filename)
    except Exception as exc:
        return jsonify({"error": f"Could not parse file: {str(exc)}"}), 422

    if not resume_text.strip():
        return jsonify({"error": "Could not extract text from the resume. Please try a different file."}), 422

    result = analyse_resume(resume_text, jd_text)
    result['filename'] = filename
    return jsonify(result)


@app.route('/api/screen-text', methods=['POST'])
def screen_resume_text():
    """
    Alternative endpoint that accepts plain JSON:
      { "resume_text": "...", "job_description": "..." }
    """
    data = request.get_json(force=True, silent=True) or {}
    resume_text = data.get('resume_text', '').strip()
    jd_text     = data.get('job_description', '').strip()

    if not resume_text:
        return jsonify({"error": "resume_text is required"}), 400
    if not jd_text:
        return jsonify({"error": "job_description is required"}), 400

    result = analyse_resume(resume_text, jd_text)
    return jsonify(result)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
