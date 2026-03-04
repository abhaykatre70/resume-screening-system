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

# ── App Setup ────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10 MB

ALLOWED_EXT = {'pdf', 'docx', 'txt'}

# ── Load spaCy model (en_core_web_sm) ────────────────────────────────────────
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


def analyse_resume(resume_text: str, jd_text: str) -> dict:
    """Full analysis pipeline."""
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

    return {
        "overall_score":      overall,
        "skill_match_score":  skill_result['score'],
        "tfidf_score":        tfidf_score,
        "matched_skills":     skill_result['matched'],
        "missing_skills":     skill_result['missing'],
        "resume_skills":      resume_skills,
        "jd_skills":          jd_skills,
        "entities":           entities,
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
