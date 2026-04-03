document.addEventListener('DOMContentLoaded', () => {

    // --- Theme Toggle ---
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    let isDarkMode = true;

    themeToggle.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
        themeIcon.textContent = isDarkMode ? '☀️' : '🌙';
        themeToggle.innerHTML = `<span id="themeIcon">${isDarkMode ? '☀️' : '🌙'}</span> ${isDarkMode ? 'Light Mode' : 'Dark Mode'}`;
    });

    // --- Element References ---
    const form = document.getElementById('screenForm');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('resumeFile');
    const filePreview = document.getElementById('filePreview');
    const fileNameDisplay = document.getElementById('fileName');
    const removeBtn = document.getElementById('removeFile');
    const jobDesc = document.getElementById('jobDesc');
    const submitBtn = document.getElementById('submitBtn');
    const templateChips = document.querySelectorAll('.chip');

    // Result Panels
    const rPlaceholder = document.getElementById('resultsPlaceholder');
    const rLoading = document.getElementById('resultsLoading');
    const rContent = document.getElementById('resultsContent');
    const rError = document.getElementById('resultsError');
    const errorMsg = document.getElementById('errorMsg');
    const retryBtn = document.getElementById('retryBtn');

    // Loading Steps
    const lsteps = [
        document.getElementById('ls1'),
        document.getElementById('ls2'),
        document.getElementById('ls3'),
        document.getElementById('ls4')
    ];

    // Score Elements
    const scoreValue = document.getElementById('scoreValue');
    const skillBar = document.getElementById('skillBar');
    const skillVal = document.getElementById('skillVal');
    const tfidfBar = document.getElementById('tfidfBar');
    const tfidfVal = document.getElementById('tfidfVal');
    const verdictBadge = document.getElementById('verdictBadge');

    // Generative AI
    const aiSuggestionBox = document.getElementById('aiSuggestionBox');
    const aiContent = document.getElementById('aiContent');

    // Tabs & Lists
    const tabs = document.querySelectorAll('.stab');
    const panels = document.querySelectorAll('.stab-panel');
    const pMatched = document.getElementById('panelMatched');
    const pMissing = document.getElementById('panelMissing');
    const pResume = document.getElementById('panelResume');
    const mCount = document.getElementById('matchedCount');
    const msCount = document.getElementById('missingCount');
    const rCount = document.getElementById('resumeCount');

    // Entities
    const entityContent = document.getElementById('entityContent');
    const entitySection = document.getElementById('entitySection');

    // --- Templates ---
    const tpls = {
        ml: "We are seeking a Machine Learning Engineer. Requirements: Python, scikit-learn, TensorFlow, PyTorch, deep learning, NLP, natural language processing, feature engineering, numpy, pandas, SQL, Git, GitHub, Docker, AWS. Experience with regression, classification, and clustering algorithms. Strong communication and problem solving skills required.",
        web: "Looking for a Full Stack Web Developer with expertise in HTML, CSS, JavaScript, React, Node, Express, and REST API development. Experience with Git, GitHub, Bootstrap, and MongoDB is required. Strong communication, teamwork, and problem solving skills needed.",
        ds: "Data Scientist wanted. Requirements: Python, pandas, numpy, SQL, Machine Learning, regression, classification, clustering, matplotlib, seaborn, Power BI, Tableau, data analysis, scikit-learn. Strong communication and leadership skills.",
        dev: "We are hiring a Python Full Stack Developer. Required skills: Python, Flask, JavaScript, React, Machine Learning, scikit-learn, REST API, Docker, AWS, Git, GitHub, MySQL, MongoDB, PostgreSQL, Linux, Agile, Scrum, problem solving, teamwork, communication.",
    };

    templateChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const key = chip.getAttribute('data-tpl');
            jobDesc.value = tpls[key];
        });
    });

    // --- File Handling ---
    dropZone.addEventListener('click', (e) => {
        if (e.target === removeBtn) return;
        fileInput.click();
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFile();
        }
    });

    fileInput.addEventListener('change', handleFile);

    removeBtn.addEventListener('click', () => {
        fileInput.value = '';
        handleFile();
    });

    function handleFile() {
        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            fileNameDisplay.textContent = file.name;
            filePreview.style.display = 'flex';
            dropZone.querySelector('.drop-icon').style.display = 'none';
            dropZone.querySelector('.drop-text').style.display = 'none';
            dropZone.querySelector('.drop-hint').style.display = 'none';
        } else {
            filePreview.style.display = 'none';
            dropZone.querySelector('.drop-icon').style.display = 'block';
            dropZone.querySelector('.drop-text').style.display = 'block';
            dropZone.querySelector('.drop-hint').style.display = 'block';
        }
    }

    // --- Form Submit ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!fileInput.files.length) return alert('Please upload a resume first.');
        if (!jobDesc.value.trim()) return alert('Please enter a target job description.');

        startLoading();

        const formData = new FormData();
        formData.append('resume', fileInput.files[0]);
        formData.append('job_description', jobDesc.value.trim());

        try {
            const res = await fetch('/api/screen', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to screen resume.');

            showResults(data);
        } catch (err) {
            showError(err.message);
        }
    });

    retryBtn.addEventListener('click', () => {
        showPanel('placeholder');
    });

    // --- Loading Animation ---
    function startLoading() {
        showPanel('loading');
        submitBtn.disabled = true;

        // Simulate steps for UI feel
        lsteps.forEach(s => { s.classList.remove('active', 'done'); });
        lsteps[0].classList.add('active');

        setTimeout(() => setStep(1), 600);
        setTimeout(() => setStep(2), 1200);
        setTimeout(() => setStep(3), 1800);
    }

    function setStep(idx) {
        if (rLoading.style.display !== 'flex') return; // Cancel if done
        if (idx > 0) {
            lsteps[idx - 1].classList.remove('active');
            lsteps[idx - 1].classList.add('done');
        }
        if (idx < lsteps.length) {
            lsteps[idx].classList.add('active');
        }
    }

    function showPanel(type) {
        rPlaceholder.style.display = 'none';
        rLoading.style.display = 'none';
        rContent.style.display = 'none';
        rError.style.display = 'none';

        if (type === 'placeholder') rPlaceholder.style.display = 'flex';
        if (type === 'loading') rLoading.style.display = 'flex';
        if (type === 'content') rContent.style.display = 'flex';
        if (type === 'error') rError.style.display = 'flex';
    }

    function showError(msg) {
        submitBtn.disabled = false;
        errorMsg.textContent = msg;
        showPanel('error');
    }

    // --- Render Results ---
    function showResults(data) {
        submitBtn.disabled = false;
        showPanel('content');

        // 1. Overall Score
        const score = Math.round(data.overall_score);
        animateValue(scoreValue, 0, score, 1000);

        // 2. Bars
        skillBar.style.width = '0%';
        tfidfBar.style.width = '0%';

        setTimeout(() => {
            skillBar.style.width = `${data.skill_match_score}%`;
            skillVal.textContent = `${data.skill_match_score}%`;

            tfidfBar.style.width = `${data.tfidf_score}%`;
            tfidfVal.textContent = `${data.tfidf_score}%`;
        }, 200);

        // 3. Verdict Badge
        if (score >= 80) {
            verdictBadge.textContent = '🌟 Excellent Match';
            verdictBadge.style.background = 'rgba(16, 185, 129, 0.1)';
            verdictBadge.style.color = 'var(--success)';
            verdictBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        } else if (score >= 50) {
            verdictBadge.textContent = '⚠️ Partial Match';
            verdictBadge.style.background = 'rgba(250, 204, 21, 0.1)';
            verdictBadge.style.color = '#eab308';
            verdictBadge.style.borderColor = 'rgba(250, 204, 21, 0.3)';
        } else {
            verdictBadge.textContent = '❌ Poor Match';
            verdictBadge.style.background = 'rgba(239, 68, 68, 0.1)';
            verdictBadge.style.color = 'var(--danger)';
            verdictBadge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        }

        // AI Feedback Text
        if (data.ai_feedback) {
            aiContent.innerHTML = formatAIText(data.ai_feedback);
            aiSuggestionBox.style.display = 'block';
        } else {
            aiSuggestionBox.style.display = 'none';
        }

        // 4. Skills Tabs
        renderSkills(pMatched, data.matched_skills, 'sk-matched');
        renderSkills(pMissing, data.missing_skills, 'sk-missing');
        renderSkills(pResume, data.resume_skills, 'sk-resume');

        mCount.textContent = data.matched_skills.length;
        msCount.textContent = data.missing_skills.length;
        rCount.textContent = data.resume_skills.length;

        // Reset tabs
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        tabs[0].classList.add('active');
        panels[0].classList.add('active');

        // 5. Entities
        let hasEntities = false;
        entityContent.innerHTML = '';
        const entMap = {
            'PERSON': 'People / Names',
            'ORG': 'Organisations',
            'GPE': 'Locations',
            'DATE': 'Dates'
        };

        for (const [key, label] of Object.entries(entMap)) {
            if (data.entities[key] && data.entities[key].length > 0) {
                hasEntities = true;
                const div = document.createElement('div');
                div.className = 'entity-box';

                let listHTML = data.entities[key].slice(0, 5).map(e => `<span>• ${e}</span>`).join('');
                if (data.entities[key].length > 5) listHTML += `<span>• +${data.entities[key].length - 5} more</span>`;

                div.innerHTML = `
          <div class="entity-type">${label}</div>
          <div class="entity-list">${listHTML}</div>
        `;
                entityContent.appendChild(div);
            }
        }

        entitySection.style.display = hasEntities ? 'block' : 'none';
    }

    function formatAIText(text) {
        const formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        const lines = formatted.split('\n');
        let html = '';
        let inList = false;
        for (let line of lines) {
            if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                if (!inList) { html += '<ul>'; inList = true; }
                html += `<li>${line.substring(2)}</li>`;
            } else {
                if (inList) { html += '</ul>'; inList = false; }
                if (line.trim()) html += `<p>${line}</p>`;
            }
        }
        if (inList) html += '</ul>';
        return html;
    }

    function renderSkills(container, items, cssClass) {
        if (!items || items.length === 0) {
            container.innerHTML = `<span class="no-skills">No skills found</span>`;
            return;
        }
        container.innerHTML = items.map(sk => `<span class="sk-chip ${cssClass}">${sk}</span>`).join('');
    }

    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            obj.innerHTML = Math.floor(easeProgress * (end - start) + start) + '%';
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // --- Tab Switch Logic ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(`panel${targetId.charAt(0).toUpperCase() + targetId.slice(1)}`).classList.add('active');
        });
    });

    document.getElementById('exportReport').addEventListener('click', () => {
        window.print();
    });

    document.getElementById('newScreen').addEventListener('click', () => {
        fileInput.value = '';
        handleFile();
        showPanel('placeholder');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

});
