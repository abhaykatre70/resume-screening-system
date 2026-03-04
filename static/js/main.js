document.addEventListener('DOMContentLoaded', () => {

    // --- Element References ---
    const form = document.getElementById('screenForm');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('resumeFile');
    const browseBtn = document.getElementById('browseBtn');
    const filePreview = document.getElementById('filePreview');
    const fileNameDisplay = document.getElementById('fileName');
    const removeBtn = document.getElementById('removeFile');
    const jobDesc = document.getElementById('jobDesc');
    const charCount = document.getElementById('charCount');
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
    const ringFill = document.getElementById('ringFill');
    const scoreValue = document.getElementById('scoreValue');
    const skillBar = document.getElementById('skillBar');
    const skillVal = document.getElementById('skillVal');
    const tfidfBar = document.getElementById('tfidfBar');
    const tfidfVal = document.getElementById('tfidfVal');
    const verdictBadge = document.getElementById('verdictBadge');

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

    // Data Store for Export
    let currentResult = null;

    // --- Templates ---
    const tpls = {
        ml: "We are seeking a Machine Learning Engineer to join our team. Experience with Python, Scikit-Learn, TensorFlow, and PyTorch is required. Strong understanding of deep learning, NLP, and feature engineering. SQL and Git are nice to have.",
        web: "Looking for a Frontend Web Developer with expertise in HTML, CSS, JavaScript, and React. Experience with Node, Express, and REST APIs is a plus. Needs to be comfortable with Git and Bootstrap. Strong communication and problem solving skills.",
        ds: "Data Scientist wanted. You will analyse complex datasets using Python, Pandas, Numpy, and SQL. Experience with Tableau or Power BI is required. Machine learning knowledge (regression, classification) is highly valued.",
        devops: "DevOps Engineer role. Looking for experience with AWS or GCP. Strong skills in Docker, Kubernetes, and CI/CD pipelines (Jenkins). Familiarity with Linux, Bash scripting, and Terraform is preferred."
    };

    templateChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const key = chip.getAttribute('data-tpl');
            jobDesc.value = tpls[key];
            updateCharCount();
        });
    });

    // --- File Handling ---
    browseBtn.addEventListener('click', (e) => {
        e.preventDefault();
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

    // --- Job Description ---
    function updateCharCount() {
        charCount.textContent = `${jobDesc.value.length} characters`;
    }
    jobDesc.addEventListener('input', updateCharCount);

    // --- Form Submit ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!fileInput.files.length) return alert('Please upload a resume first.');
        if (!jobDesc.value.trim()) return alert('Please enter a job description.');

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

            currentResult = data;
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

        setTimeout(() => setStep(1), 400);
        setTimeout(() => setStep(2), 900);
        setTimeout(() => setStep(3), 1300);
    }

    function setStep(idx) {
        if (!rLoading.style.display === 'block') return; // Cancel if done
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

        // 1. Overall Score Animation
        const score = Math.round(data.overall_score);
        animateValue(scoreValue, 0, score, 1500);

        // SVG Ring Dashoffset
        // Full ring = 314
        const offset = 314 - (score / 100) * 314;
        setTimeout(() => {
            ringFill.style.strokeDashoffset = offset;

            // Color ring based on score
            if (score >= 80) ringFill.style.stroke = 'var(--success)';
            else if (score >= 50) ringFill.style.stroke = '#facc15';
            else ringFill.style.stroke = 'var(--danger)';
        }, 100);

        // 2. Bars
        skillBar.style.width = '0%';
        tfidfBar.style.width = '0%';

        setTimeout(() => {
            skillBar.style.width = `${data.skill_match_score}%`;
            skillVal.textContent = `${data.skill_match_score}%`;

            tfidfBar.style.width = `${data.tfidf_score}%`;
            tfidfVal.textContent = `${data.tfidf_score}%`;
        }, 500);

        // 3. Verdict Badge
        if (score >= 80) {
            verdictBadge.textContent = '🌟 Excellent Match';
            verdictBadge.style.background = 'rgba(16, 185, 129, 0.1)';
            verdictBadge.style.color = '#34d399';
            verdictBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        } else if (score >= 50) {
            verdictBadge.textContent = '⚠️ Partial Match';
            verdictBadge.style.background = 'rgba(250, 204, 21, 0.1)';
            verdictBadge.style.color = '#fde047';
            verdictBadge.style.borderColor = 'rgba(250, 204, 21, 0.3)';
        } else {
            verdictBadge.textContent = '❌ Poor Match';
            verdictBadge.style.background = 'rgba(239, 68, 68, 0.1)';
            verdictBadge.style.color = '#fca5a5';
            verdictBadge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        }

        // 4. Skills Tabs
        renderSkills(pMatched, data.matched_skills, 'sk-matched');
        renderSkills(pMissing, data.missing_skills, 'sk-missing');
        renderSkills(pResume, data.resume_skills, 'sk-resume');

        mCount.textContent = data.matched_skills.length;
        msCount.textContent = data.missing_skills.length;
        rCount.textContent = data.resume_skills.length;

        // Reset tabs to Matched
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
            'DATE': 'Dates / Durations'
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
            // easeOutQuart
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            obj.innerHTML = Math.floor(easeProgress * (end - start) + start);
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

    // --- Exports ---
    document.getElementById('exportJSON').addEventListener('click', () => {
        if (!currentResult) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentResult, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `resume_analysis_${currentResult.filename}.json`;
        a.click();
    });

    document.getElementById('exportReport').addEventListener('click', () => {
        window.print();
    });

    document.getElementById('newScreen').addEventListener('click', () => {
        form.reset();
        fileInput.value = '';
        handleFile();
        charCount.textContent = '0 characters';
        ringFill.style.strokeDashoffset = 314;
        ringFill.style.stroke = 'var(--accent-1)';
        showPanel('placeholder');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

});
