
# FinSaathi: The AI-Powered Financial Wellness Companion

## Key Innovations & Features

FinSaathi leverages cutting-edge AI to deliver features that go far beyond traditional personal finance apps. it also supports real-time transalation to various indian languages.

### 1. AI-Powered Financial Overview & Advice
- **Holistic Health Report:** At the heart of the dashboard is an AI-generated report that synthesizes all financial data—transactions, budgets, debts, investments—into a single **Financial Wellness Score** and provides a personalized headline summary.
- **Personalized Chatbot:** Users can ask complex, natural language questions about their finances (e.g., *"How much did I spend on food last month compared to my budget?"*) and receive instant, data-driven answers.
- **Adaptive Recommendations:** The AI learns from user feedback on its advice, refining its recommendations over time to become a truly trusted financial companion.

### 2. Proactive Financial Management
- **Subscription Detection & Bill Negotiation:** The AI automatically detects recurring subscriptions and flags them. For supported bills, it can even generate a **negotiation script or email**, empowering users to contact providers and ask for better rates.
- **Smart Notifications:** Proactive alerts in the header warn users about upcoming bills and when they are approaching their budget limits, preventing financial surprises.
- **Tax Center:** The AI automatically flags potentially tax-deductible expenses, which are then collected in a dedicated Tax Center for easy review and export at tax time.

### 3. Comprehensive Financial Tooling
- **Complete Tracking:** Manage transactions, accounts, budgets, investments (including stocks, crypto, and deposits), debts, and savings goals all in one place.
- **Debt Pay-down Planner:** Generate personalized debt pay-down plans using "Avalanche" or "Snowball" strategies to become debt-free faster.
- **Gamification:** Earn points and achievements for building healthy financial habits, making personal finance engaging and rewarding.
- **Real-time Translation:** Instantly switch the application's language to a wide range of Indian regional languages, making personal finance accessible to everyone.

### 4. Modern User Experience
- **Stunning Frosted Glass UI:** A beautiful, modern interface featuring a dynamic, multi-color blurred background and semi-transparent "frosted glass" elements that create a sense of depth and a premium user experience across the entire app.
- **Responsive Design:** A fully responsive layout that works seamlessly on desktop, tablet, and mobile devices.
- **Light & Dark Modes:** Choose between a light or dark theme to suit your preference.

## Features by Page

Here is a detailed breakdown of the features available on each page of the application.

### 1. Dashboard (`/dashboard`)
The central hub for your financial life at a glance.
- **AI Financial Health Report**: An AI-generated summary of your overall financial status, complete with a **Financial Wellness Score** from 0-100, budget/goal analysis, and actionable advice.
- **Summary Cards**: High-level cards displaying your total income, total expenses, net account balance, and this month's cash flow.
- **Recent Transactions**: A quick-view list of your last five financial activities.
- **Expense Distribution Chart**: An interactive pie chart visualizing your top 5 spending categories for the month.
- **Budget Summary**: Progress bars showing spending against your most important budgets.
- **Goal Summary**: A snapshot of your progress towards your top savings goals.
- **Investment Summary**: See your total portfolio value and a list of your top-performing investments.
- **Upcoming Bills**: An AI-powered forecast of your upcoming recurring payments.

### 2. Transactions (`/transactions`)
The central ledger for all your financial activities.
- **Comprehensive Table**: View, filter, and sort all your transactions by date, category, type, and more.
- **Add & Edit Transactions**: Full CRUD (Create, Read, Update, Delete) functionality for all transaction types (Income, Expense, Investment, Transfer).
- **AI-Powered Import**:
    - **CSV Import**: Upload a bank statement in CSV format, and the AI will parse and categorize the transactions.
    - **Image Import**: Upload a screenshot from a UPI app (Google Pay, PhonePe), and the AI will extract the transaction data.
    - **PDF Import**: Upload a PDF bank or credit card statement for automatic parsing.
- **AI-Assisted Creation**:
    - **Category Suggestion**: The AI suggests a category as you type the transaction description.
    - **Tax Deduction Check**: Use the AI to check if an expense is potentially tax-deductible in India.
- **Bulk Management**: Select multiple transactions at once to delete them in a single action.
- **CSV Export**: Download your filtered transaction history as a CSV file.

### 3. Subscriptions (`/subscriptions`)
Automatically find and manage your recurring payments.
- **AI Detection**: FinSaathi automatically analyzes your transaction history to identify recurring subscriptions and bills.
- **AI Bill Negotiation**: For any detected subscription, generate a polite and effective negotiation script or email with a single click to help you ask for a lower rate.
- **Centralized View**: See all your recurring payments, their last payment date, amount, and frequency in one place.

### 4. Analytics (`/analytics`)
Dive deep into your financial data.
- **Category Breakdown**: Interactive pie charts showing the breakdown of your income and expenses by category.
- **Monthly Overview**: A bar chart that visualizes your total income vs. expenses month-over-month.
- **Goal Progress Chart**: A vertical bar chart showing how close you are to achieving each of your savings goals.
- **Advanced Filtering**: Filter all charts and data by specific years and months to analyze your finances over any period.

### 5. Budgets (`/budgets`)
Take control of your spending.
- **Create & Manage Budgets**: Set monthly spending limits for any category.
- **Smart Category Suggestions**: When creating a budget, you can choose from existing transaction categories or create a new one.
- **Visual Progress**: Each budget is displayed as a card with a progress bar, showing how much you've spent versus your limit.

### 6. Accounts (`/accounts`)
A consolidated view of your financial accounts.
- **Link Accounts**: Manually add any financial account (e.g., checking, savings, credit card) to track its balance.
- **CRUD Operations**: Full ability to add, edit, and delete accounts.
- **Cascade Deletion**: Deleting an account safely removes all associated transactions to maintain data integrity.

### 7. Investments (`/investments`)
Track and manage your investment portfolio.
- **Comprehensive Tracking**: Add various investment types, including Stocks, Mutual Funds, Crypto, Fixed Deposits (FD), Recurring Deposits (RD), and more.
- **Automated Calculations**: For FDs and RDs, the app automatically calculates the estimated maturity value based on principal, interest rate, and tenure.
- **AI Market Alerts**: The AI fetches and displays relevant, recent news for your investments, classifying each item as an 'Opportunity', 'Risk', or 'Neutral' event.
- **Performance Tracking**: See the overall return on your investments where applicable (e.g., for stocks with a purchase price).

### 8. Debts (`/debts`)
Plan your path to becoming debt-free.
- **Debt Management**: Track all your debts, including credit cards, personal loans, home loans, and more.
- **AI Debt Pay-down Planner**: Generate a personalized, step-by-step monthly payment plan using either the "Avalanche" (highest interest first) or "Snowball" (smallest balance first) strategy.
- **Amortization Schedule**: For any loan, view a detailed month-by-month amortization schedule to see how your payments are allocated between principal and interest.

### 9. Goals (`/goals`)
Save for what matters most.
- **Create & Manage Goals**: Set savings goals with a target amount and track your progress.
- **AI Goal Creation**: Describe your goal in natural language (e.g., "I want to save for a trip to Europe"), and the AI will automatically create a named goal with an estimated target amount.
- **Add Funds**: Easily contribute to your goals by transferring funds from your linked accounts. This automatically creates the corresponding transaction.

### 10. Tax Center (`/tax-center`)
Simplify your tax preparation.
- **Centralized View**: All transactions flagged as "potentially tax-deductible" by the AI are collected here.
- **Filter and Export**: Filter your deductible expenses by category and time period, and export the list as a CSV file for easy tax filing.

### 11. AI Advice & Chatbot (`/advice`, `/chatbot`)
Your personal financial expert, available 24/7.
- **Personalized Advice**: Receive tailored financial advice based on your risk tolerance, goals, and complete financial data. The AI learns from your feedback to improve its recommendations over time.
- **Conversational Chat**: Ask complex questions about your finances in plain language (e.g., "Compare my spending on food this month vs. last month") and get instant, data-driven answers.

### 12. Profile & Settings (`/profile`, `/settings`)
Manage your account and preferences.
- **Profile Management**: Update your name and profile picture.
- **Language Selection**: Choose your preferred language for the application interface.
- **Theme Toggle**: Switch between light and dark mode to suit your preference.

## Tech Stack & Architecture

- **Frontend:** [Next.js](https://nextjs.org/) with [React](https://reactjs.org/) and [TypeScript](https://www.typescriptlang.org/).
- **UI:** A custom-themed interface built with [ShadCN UI](https://ui.shadcn.com/) and [Tailwind CSS](https://tailwindcss.com/). The app features a modern "frosted glass" aesthetic with dynamic, blurred background gradients and semi-transparent elements for a premium look and feel.
- **Backend & Database:** [Google Firebase](https://firebase.google.com/) for Authentication (Firebase Auth), Database (Firestore), and File Storage (Firebase Storage).
- **Generative AI:** Google's powerful [Gemini](https://deepmind.google/technologies/gemini/) models, orchestrated via [Genkit](https://firebase.google.com/docs/genkit), Google's open-source AI framework.

## Local Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/en) (v18 or later recommended)
- [npm](https://www.npmjs.com/)
- A [Google Firebase](https://firebase.google.com/) project with **Firestore**, **Firebase Authentication**, and **Firebase Storage** enabled.
- A **Google AI API Key** for accessing the Gemini models, obtainable from [Google AI Studio](https://aistudio.google.com/app/apikey).

### Installation & Running
1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/Pranavpawar07112007/finsaathi.git
    cd finsaathi
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment:**
    - Create `src/firebase/config.ts` with your Firebase project configuration.
    - Create a `.env` file in the project root and add your `GEMINI_API_KEY`.

4.  **Run the Application:**
    The project requires two concurrent processes.
    - **Terminal 1 (Genkit AI Flows):** `npm run genkit:dev`
    - **Terminal 2 (Next.js Frontend):** `npm run dev`

5.  **Open in Browser:** Navigate to `http://localhost:9002` to use FinSaathi.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
