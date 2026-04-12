# ⚡ ResumeIQ - AI-Powered Resume Screening System

An intelligent, full-stack Resume Screening application designed to streamline HR hiring processes using NLP (Natural Language Processing) and Generative AI. 
Upload a candidate's resume (PDF, DOCX, TXT) alongside a target job description, and the system will automatically extract skills, calculate an exact match score, and provide deeper insights via a configured AI.

> 🚀 **Live Demo:** [resume-screening-system-gray.vercel.app](https://resume-screening-system-gray.vercel.app/)

---

## ✨ Key Features

- **Document Parsing:** Instantly extracts raw text from PDF, DOCX, and TXT files securely.
- **NLP & Cosine Similarity Score:** Uses `spaCy` to lemmatize and clean text before generating a match score via `scikit-learn`'s TF-IDF vectorizer and Cosine Similarity, comparing the resume to the job description.
- **Skill Extraction:** Employs a predefined taxonomy of dozens of industry-standard tech stack and soft skills to identify which requirements the candidate possesses and what they are missing.
- **Generative AI Feedback:** Integrates with the **Groq API** (`llama-3.1-8b-instant`) to generate advanced, conversational, and targeted feedback on the candidate's resume based on the job description.
- **Responsive UI & Themes:** A state-of-the-art Vanilla CSS/JS frontend with a dark/light mode toggle, dynamic SVG animations, floating layout adjustments, and glass-card UI designs. 
- **Print-Ready Reports:** Features a dynamic `@media print` query that seamlessly collapses navigation bounds, enforces light-mode styling automatically, and converts the results into a beautiful and readable print/PDF format.

---

## 🛠️ Technology Stack

**Backend:**
- **Python 3.10+**
- **Flask** (Server routing & REST endpoints)
- **Werkzeug** (Secure file handling)
- **PyPDF2 / python-docx** (File parsing)

**Machine Learning / NLP / AI:**
- **spaCy** (`en_core_web_sm` pipeline) for Tokenization and Lemmatization 
- **scikit-learn** (`TfidfVectorizer`, `cosine_similarity`)
- **NumPy**
- **Groq API** (Llama 3 generative model for real-time candidate overview)

**Frontend:**
- **HTML5, Vanilla CSS3, Vanilla ES6 JavaScript**
- Fully custom design system using dynamic CSS properties (no massive frameworks needed)

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/abhaykatre-dev/resume-screening-system.git
cd resume-screening-system
```

### 2. Create a Virtual Environment & Install Dependencies
```bash
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
```

*(Note: If spaCy fails to find the language model automatically, run)*
```bash
python -m spacy download en_core_web_sm
```

### 3. Configure API Keys

Create a `.env` file in the root directory and add your Groq API key to enable AI insights:
```env
AI_API_KEY=your_groq_api_key_here
```

### 4. Run the Application
```bash
python app.py
```

Open your browser and navigate to `http://127.0.0.1:5000` to access ResumeIQ.

---

## 👨‍💻 Developer & Portfolio

Designed and Built by **Abhay Katre**  
- **🌐 Portfolio:** [abhaykatre.me](https://abhaykatre.me/)
- **💼 LinkedIn:** [in/abhaykatre-dev](https://www.linkedin.com/in/abhaykatre-dev/)
- **🐙 GitHub:** [abhaykatre-dev](https://github.com/abhaykatre-dev)

---

*ResumeIQ leverages modern web tools and LLM integrations to make initial screening phases 10x faster and entirely unbiased.*
