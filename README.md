# FCC Home - Coaching Management System

Welcome to **FCC Home**, a Coaching Management System designed to streamline the management of students, attendance, fee collection, and more. Built with **React**, this app provides an interactive, user-friendly interface and a wide range of features to simplify coaching operations.

### Features:
- **Student Admission**: Effortlessly manage student registrations and track their progress.
- **Attendance Tracking**: Record and monitor student attendance with ease.
- **Fee Management**: Simplify fee collection and manage fee reports efficiently.
- **Student List & Profiles**: Access a comprehensive list of students along with detailed profiles.
- **File Upload**: Upload important files and documents related to students or courses.
- **Quiz Section**: Engage students with quizzes to enhance learning and track their skills.
- **Card Hub**: Store and manage coaching-related cards and materials.
- **CTC/CTG View**: View CTC (Cost to Company) and CTG (Cost to Group) details for better financial analysis.

### Live Demo:
You can try out the live version of this app here:  
[https://fcchome-by-fccthegurukul.vercel.app/](https://fcchome-by-fccthegurukul.vercel.app/)

### Installation:

To run the project locally, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/fcc-home-webapp.git
   cd fcc-home-webapp


2. Install the dependencies:
   ```bash
   npm install


3. Start the app locally:
   ```bash
   npm start

4. Open your browser and go to http://localhost:3000/ to view the app.
5. Backend:
   ```bash
   cd backend

7. Install the backend dependencies:
   ```bash
   npm install

8. To run this project, you will need to add the following environment variables to your .env file

`DB_USER`
`DB_HOST`
`DB_NAME`
`DB_PASSWORD`
`DB_PORT`

`DB_HOST`

8. Start the backend server:
    ```bash
   node server.js

-- The backend will run on http://localhost:5000/.
   
### Technologies Used:
- **React:** A JavaScript library for building user interfaces.
- **React Router:** For navigating between different pages and components.
- **Vercel Analytics:** For performance tracking and analytics.
- **Vercel Speed Insights:** For monitoring the speed and performance of the app.
- **Express:** Backend framework for handling server-side requests.
- **PostgreSQL:** Database management system for storing data.
- **Multer:** For handling file uploads.
- **PDFKit:** For generating PDF receipts and reports.
- **QRCode:** For generating QR codes.

### Scripts:
-  **start:** Run the app in development mode.
-  **build:** Build the app for production.
-  **test:** Run the tests.
-  **eject**: Eject the app from Create React App configurations.

**Contributing:**
Feel free to fork this repository and submit pull requests. If you encounter any issues or have suggestions, please create an issue on GitHub, and we will get back to you as soon as possible.

**License:**
This project is licensed under the [MIT](https://choosealicense.com/licenses/mit/) License - see the LICENSE file for details.


### Key Updates:
- Added backend instructions under a separate section for clarity.
- Included backend-specific dependencies (e.g., **express**, **pg**, **multer**, **pdfkit**).
- Included **PostgreSQL** setup instructions to configure the database.

You can update your `.env` file with the necessary credentials for your PostgreSQL database. This will allow you to run both the backend and frontend locally.


