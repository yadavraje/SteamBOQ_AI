# SteamBOQ_AI
### AI-Assisted Engineering Platform for Steam Utility Design, Pipe Sizing & Preliminary BOQ Generation

---

## Overview

SteamBOQ_AI is a Python-based engineering application developed to automate preliminary steam utility design calculations for industrial process heating systems.

The platform assists engineers in rapidly estimating steam requirements, selecting preliminary pipe sizes, sizing condensate lines, evaluating hydraulic performance, and generating engineering outputs required during the proposal and conceptual design stages.

The project combines traditional process engineering principles with modern software development practices to reduce manual calculations, improve design consistency, and accelerate project estimation.

This application is being developed as a modular engineering platform with future AI-assisted design recommendations and automated BOQ generation capabilities.

---

## 🎯 Project Objectives

- Automate repetitive steam engineering calculations.
- Reduce preliminary engineering design time.
- Standardize steam utility calculations.
- Assist engineers during proposal and estimation stages.
- Build a scalable engineering platform for industrial utility systems.

---

## ✨ Current Features

### Steam Engineering

- Steam Quantity Calculation
- Steam Property Lookup
- Steam Saturation Temperature Lookup
- Heat Load Calculation
- Product Heating Calculation

### Steam Distribution

- Steam Pipe Size Recommendation
- Steam Velocity Calculation
- Preliminary Pressure Drop Calculation

### Condensate System

- Condensate Generation Calculation
- Condensate Pipe Size Recommendation

### User Interface

- Interactive Streamlit Application
- Modular Engineering Forms
- Engineering Results Dashboard

---

## 🏗️ Project Architecture

```
SteamBOQ_AI
│
├── app/
│   ├── components/
│   ├── forms/
│   ├── pages/
│   └── utils/
│
├── calculations/
│   ├── steam/
│   ├── condensate/
│   └── hydraulics/
│
├── databases/
│
├── constants/
│
├── docs/
│
└── app.py
```

The application follows a modular architecture where engineering calculations, user interface, reusable components, and engineering databases are separated for improved maintainability and scalability.

---

## ⚙️ Technologies Used

### Programming

- Python

### Framework

- Streamlit

### Data Processing

- Pandas
- NumPy

### Development

- Git
- GitHub

---

## 📊 Engineering Modules

| Module | Status |
|---------|--------|
| Heat Load Calculation | ✅ Complete |
| Steam Quantity Calculation | ✅ Complete |
| Steam Property Database | ✅ Complete |
| Steam Pipe Sizing | ✅ Complete |
| Steam Velocity Check | ✅ Complete |
| Pressure Drop Calculation | ✅ Complete |
| Condensate Generation | ✅ Complete |
| Condensate Pipe Sizing | ✅ Complete |
| Engineering Summary | ✅ Complete |
| BOQ Generation | 🚧 In Progress |
| Cost Estimation | 📅 Planned |
| PDF Report Generation | 📅 Planned |
| AI Engineering Assistant | 🔮 Future |

---

## 📷 Application Screenshots

> Screenshots will be added after UI refinement.

- Dashboard
- Steam Calculation Module
- Pipe Sizing Module
- Condensate Module
- Design Summary

---

## 🚀 Installation

Clone the repository

```bash
git clone https://github.com/yourusername/SteamBOQ_AI.git
```

Navigate to the project

```bash
cd SteamBOQ_AI
```

Install dependencies

```bash
pip install -r requirements.txt
```

Run the application

```bash
streamlit run app.py
```

---

## Engineering Workflow

```
User Input
      │
      ▼
Heat Load Calculation
      │
      ▼
Steam Quantity
      │
      ▼
Steam Property Lookup
      │
      ▼
Steam Pipe Sizing
      │
      ▼
Velocity Check
      │
      ▼
Pressure Drop
      │
      ▼
Condensate Generation
      │
      ▼
Condensate Pipe Sizing
      │
      ▼
Engineering Summary
      │
      ▼
Future BOQ Generation
```

---

## 🛣️ Development Roadmap

### Version 0.1
- Steam Quantity Calculation
- Steam Pipe Sizing
- Condensate Sizing

### Version 0.2
- Hydraulic Calculations
- Engineering Dashboard

### Version 0.3
- Preliminary BOQ Generation

### Version 0.4
- Cost Estimation Module
- PDF Report Generation

### Version 0.5
- AI-Assisted Engineering Recommendations

### Version 1.0
- Complete Engineering Design Assistant

---

## 🎯 Future Vision

SteamBOQ_AI is envisioned as a comprehensive engineering decision-support platform for industrial utility system design.

Future capabilities include:

- AI-assisted engineering recommendations
- Intelligent pipe routing suggestions
- Automated BOQ generation
- Cost estimation
- Report generation
- Multi-utility support (Steam, Hot Oil, Chilled Water, Cooling Water)
- Engineering standards integration
- LLM-powered engineering assistant

---

## 👨‍💻 Author

**Rajesh Yadav**

Engineering | Data Analytics | Machine Learning | AI

GitHub: https://github.com/yadavraje
