"""Configurable skill taxonomy: category -> canonical skill -> aliases.
Edit this file (or extend TAXONOMY at runtime) to teach the system new skills. Matching is case-insensitive."""

TAXONOMY: dict[str, dict[str, list[str]]] = {
    "Programming Languages": {
        "Python": ["python3", "py"], "Java": ["core java", "java se", "j2ee"], "JavaScript": ["js", "ecmascript", "es6"],
        "TypeScript": ["ts"], "C": [], "C++": ["cpp"], "C#": ["csharp", "c sharp"], "Go": ["golang"], "R": ["r programming", "rstudio"],
        "SQL": ["structured query language"], "Bash": ["shell scripting", "shell script", "bash scripting"],
        "Kotlin": [], "Rust": [], "PHP": [], "Scala": [],
    },
    "Frontend": {
        "HTML": ["html5"], "CSS": ["css3"], "React": ["reactjs", "react.js"], "Angular": ["angularjs"], "Vue": ["vuejs", "vue.js"],
        "Tailwind CSS": ["tailwind", "tailwindcss"], "Bootstrap": [], "Redux": [], "Responsive Design": ["responsive web design"],
        "Next.js": ["nextjs"], "Web Accessibility": ["accessibility", "wcag", "a11y"],
    },
    "Backend": {
        "Node.js": ["nodejs", "node js"], "Express": ["express.js", "expressjs"], "FastAPI": [], "Flask": [], "Django": [],
        "Spring Boot": ["springboot", "spring framework", "spring"], "REST APIs": ["rest api", "restful", "restful api", "rest", "restful apis"],
        "GraphQL": [], "Microservices": ["microservice"], "Authentication": ["jwt", "oauth", "oauth2"], "System Design": ["distributed systems", "scalability"],
        "Hibernate": ["jpa"], "Maven": [], "Message Queues": ["kafka", "rabbitmq"],
    },
    "Databases": {
        "MySQL": [], "PostgreSQL": ["postgres"], "MongoDB": ["mongo", "nosql"], "SQLite": [], "Redis": [], "Database Design": ["database modeling", "normalization", "erd"],
        "SQLAlchemy": [], "Oracle": ["oracle db", "pl/sql"],
    },
    "Cloud": {
        "AWS": ["amazon web services", "ec2", "s3", "lambda"], "Azure": ["microsoft azure"], "GCP": ["google cloud", "google cloud platform"],
        "Cloud Computing": ["cloud architecture", "cloud infrastructure"], "Serverless": [], "Cloud Networking": ["vpc", "load balancer", "load balancing"],
        "IAM": ["identity and access management"],
    },
    "DevOps": {
        "Docker": ["containers", "containerization", "dockerfile"], "Kubernetes": ["k8s"], "CI/CD": ["cicd", "continuous integration", "continuous delivery", "continuous deployment"],
        "Jenkins": [], "GitHub Actions": [], "Terraform": ["infrastructure as code", "iac"], "Ansible": [], "Linux": ["ubuntu", "unix"],
        "Monitoring": ["prometheus", "grafana", "observability"], "Nginx": [],
    },
    "Data Analytics": {
        "Pandas": [], "NumPy": [], "Excel": ["microsoft excel", "ms excel", "advanced excel", "spreadsheets"], "Power BI": ["powerbi"], "Tableau": [],
        "Data Visualization": ["data viz", "matplotlib", "seaborn", "plotly"], "Statistics": ["statistical analysis", "hypothesis testing", "probability"],
        "Data Cleaning": ["data wrangling", "data preprocessing", "data preparation"], "ETL": ["data pipelines", "data pipeline"], "Exploratory Data Analysis": ["eda"],
        "A/B Testing": ["ab testing"], "Data Storytelling": [],
    },
    "AI/ML": {
        "Machine Learning": ["ml", "supervised learning", "unsupervised learning"], "Scikit-learn": ["sklearn", "scikit learn"], "Deep Learning": ["neural networks", "neural network"],
        "TensorFlow": ["tf", "keras"], "PyTorch": ["torch"], "NLP": ["natural language processing", "text mining", "spacy", "nltk"],
        "Computer Vision": ["opencv", "image classification", "object detection"], "Feature Engineering": [], "Model Evaluation": ["cross validation", "cross-validation", "model validation"],
        "MLOps": ["model deployment", "mlflow"], "LLMs": ["large language models", "llm", "generative ai", "gpt", "transformers"], "Prompt Engineering": [],
        "RAG": ["retrieval augmented generation", "retrieval-augmented generation", "vector database", "vector databases"], "Linear Algebra": [], "Mathematics": ["calculus"],
    },
    "Tools": {
        "Git": ["version control"], "GitHub": ["gitlab", "bitbucket"], "Jira": [], "Postman": [], "VS Code": ["visual studio code"], "Agile": ["scrum", "kanban"],
        "Testing": ["unit testing", "pytest", "junit", "jest", "test driven development", "tdd", "automated testing"], "Data Structures": ["dsa", "data structures and algorithms", "data structure"],
        "Algorithms": ["algorithm design", "competitive programming"], "OOP": ["object oriented programming", "object-oriented programming", "object oriented design"],
        "Debugging": ["troubleshooting"], "Design Patterns": [], "API Testing": [], "Security Basics": ["owasp", "application security"],
    },
    "Soft Skills": {
        "Communication": ["written communication", "verbal communication", "presentation skills"], "Teamwork": ["collaboration", "team player", "cross-functional"],
        "Problem Solving": ["analytical thinking", "problem-solving", "critical thinking"], "Leadership": ["team lead", "mentoring"], "Time Management": [],
        "Adaptability": ["quick learner", "fast learner"],
    },
}

# Prerequisite graph (skill -> skills best learned first). Only defined where reasonably uncontroversial.
PREREQUISITES: dict[str, list[str]] = {
    "Pandas": ["Python"], "NumPy": ["Python"], "Scikit-learn": ["Python", "NumPy", "Machine Learning"], "Machine Learning": ["Python", "Statistics"],
    "Deep Learning": ["Machine Learning", "Linear Algebra"], "TensorFlow": ["Deep Learning"], "PyTorch": ["Deep Learning"], "NLP": ["Machine Learning"],
    "Computer Vision": ["Deep Learning"], "LLMs": ["Deep Learning"], "RAG": ["LLMs"], "Prompt Engineering": ["LLMs"], "MLOps": ["Machine Learning", "Docker"],
    "Feature Engineering": ["Pandas"], "Model Evaluation": ["Machine Learning"], "Exploratory Data Analysis": ["Pandas", "Statistics"],
    "Data Visualization": ["Python"], "Data Cleaning": ["Pandas"], "ETL": ["SQL", "Python"], "A/B Testing": ["Statistics"], "Data Storytelling": ["Data Visualization"],
    "Power BI": ["Excel"], "Tableau": ["Excel"],
    "React": ["JavaScript", "HTML", "CSS"], "Redux": ["React"], "Next.js": ["React"], "Angular": ["TypeScript"], "Vue": ["JavaScript"], "TypeScript": ["JavaScript"],
    "JavaScript": ["HTML", "CSS"], "Tailwind CSS": ["CSS"], "Bootstrap": ["CSS"], "Responsive Design": ["CSS"], "Web Accessibility": ["HTML"],
    "Node.js": ["JavaScript"], "Express": ["Node.js"], "FastAPI": ["Python", "REST APIs"], "Flask": ["Python"], "Django": ["Python"],
    "Spring Boot": ["Java", "OOP"], "Hibernate": ["Java", "SQL"], "Maven": ["Java"], "REST APIs": ["Git"], "GraphQL": ["REST APIs"],
    "Microservices": ["REST APIs", "Docker"], "Authentication": ["REST APIs"], "System Design": ["REST APIs", "Database Design"], "Message Queues": ["Microservices"],
    "SQLAlchemy": ["Python", "SQL"], "PostgreSQL": ["SQL"], "MySQL": ["SQL"], "Database Design": ["SQL"], "MongoDB": ["Database Design"], "Redis": ["Database Design"],
    "Docker": ["Linux"], "Kubernetes": ["Docker"], "CI/CD": ["Git", "Docker"], "GitHub Actions": ["Git", "CI/CD"], "Jenkins": ["CI/CD"], "Terraform": ["Cloud Computing"],
    "Ansible": ["Linux"], "Monitoring": ["Linux"], "Nginx": ["Linux"], "Bash": ["Linux"],
    "AWS": ["Cloud Computing", "Linux"], "Azure": ["Cloud Computing"], "GCP": ["Cloud Computing"], "Serverless": ["Cloud Computing"], "IAM": ["Cloud Computing"],
    "Cloud Networking": ["Cloud Computing"], "Algorithms": ["Data Structures"], "Design Patterns": ["OOP"], "OOP": [], "Testing": [], "API Testing": ["REST APIs"],
    "Security Basics": [],
}

# Rough beginner-to-working-level effort (hours) used when no curated resource gives an estimate.
DEFAULT_HOURS = 12
