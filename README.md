# LawLight: Legal Analyzer App

**LawLight** is your personal, super-smart legal buddy. It helps you instantly understand lengthy contracts—just upload and get clear, actionable insights in minutes!

---

## 🚀 Prototype Overview

Imagine opening a 20-page rental agreement and actually understanding it in 2 minutes. That's what LawLight does:

- **Upload any contract** (rental, loan, employment): Summarizes the content in plain language—no more legal jargon confusion.
- **Highlights risky clauses** and potential traps: Flags what may be problematic before signing.
- **Interactive chatbot:** Tweak scenarios (late payments, early termination), see instant outcomes.
- **Ask questions naturally:** “Can my rent increase after 6 months?” Get friendly, easy-to-understand answers.
- **Visual flowcharts:** See how decisions could unfold like a “choose your own adventure” for contracts.
- **Works with local languages** & India-ready law adjustments.

---










## 🔄 User Flow

<img width="696" height="666" alt="image" src="https://github.com/user-attachments/assets/3f14d2f1-488c-4ced-ad3c-1440e47c30e3" />



---

## 🏗️ Tech Stack

- **Frontend:** Next.js  
- **Backend API:** Flask on Google Cloud Run  
- **Database:** Pinecone (Vector DB)  
- **AI Models:** Vertex AI (Gemini & Embedding)  
- **Cloud Functions:** OCR document parsing

---
## 🖥️ Getting Started / How to Run

### Prerequisites

- Node.js and npm installed  
- Python 3.x installed  
- Google Cloud SDK configured with your account  
- Access to Google Cloud services: Cloud Run, Cloud Functions, Vertex AI, Pinecone

### Frontend Setup (Next.js)
cd frontend
npm run dev

The frontend will be accessible at `http://localhost:3000`.

### Backend Setup (Flask API)
cd backend
python main.py


The backend API will run at `http://localhost:5000`.

### Deploy on Google Cloud

Refer to Google Cloud documentation for deploying Flask API on **Cloud Run** and Cloud Function setup for OCR.

Deployement Link 

https://legal-app-analyzer-seven.vercel.app/

### Configuration

- Set your API keys and environment variables (Google Cloud, Pinecone) in `.env` files or Google Cloud Secret Manager.





---



*For installation, contribution, and license details, please refer to the respective project files.*



