# IIT Patna — CET PG Timetable & Resource Hub

[![Live Web App](https://img.shields.io/badge/Web_App-Live_Deployment-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://iitp-mtech-ai-dse-timetable.vercel.app/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

A centralized timetable and academic resource platform built for the **IIT Patna CET PG 2026–27 batch**, supporting multiple M.Tech and M.S. programmes including **AI & DSE, Computer Science & Engineering, Cloud Computing, Blockchain Technology & Big Data, and related programmes**.

Designed to simplify schedule management, consolidate academic resources, reduce fragmented links, and provide direct access to Microsoft Teams, Moodle, course materials, and other academic resources.

---

## ✨ Features

- **🔐 Secure Authentication:** Firebase Authentication restricted to `@iitp.ac.in` emails (Magic Link & Password support).
- **Interactive Timetable:** Weekly class schedules with support for regular courses, electives, labs, and direct meeting/lab links.
- **🎓 Multi-Program Support:** Program-specific timetables for multiple IIT Patna CET PG programmes, including M.Tech AI & DSE, M.Tech CSE, M.Tech Cloud Computing, M.Tech Blockchain Technology & Big Data, and M.S. programmes.
- **🤝 Microsoft Teams Integration:** Discover, create, and join official Microsoft Teams groups for your specific program and specialization.
- **📚 Community Resource Hub:** Subject-wise access to community-shared notes, reference materials, and study resources fetched from a centralized MongoDB store.
- **🔗 Course Links:** Quick access to Moodle, Microsoft Teams, course materials, syllabi, and other academic links.
- **📝 Assignment Tracker:** Track upcoming assignment deadlines and pending deliverables by course.
- **📊 Cloud-Synced Attendance:** Cloud-backed `+` / `-` attendance tracking stored in Firestore, so your attendance is synced across devices.
- **🔔 Schedule Updates:** Important timetable updates, schedule changes, and class cancellations are dynamically fetched and highlighted for students.
- **🎨 Course Mapping:** Visual distinction between Regular and Elective courses with dedicated course color-coding.
- **🎯 Profile Personalization:** Personalize the platform by setting your Degree, Specialization, Session, and preferred electives.
- **📱 Responsive UI:** Lightweight, responsive interface designed for both mobile and desktop browsers.
- **⚡ Serverless Architecture:** Powered by Vercel for fast delivery, MongoDB for dynamic timetable/resource management, and Firebase for authentication & user data.

---

## ❤️ Wall of Love & Community Impact

What started as a personal utility was subsequently adopted by students across IIT Patna student groups, with users providing feedback, feature requests, and suggestions for further improvements.

> *"Impressed to see the your website for our MTech Programe"*
> — **Chandan Sharma**

> *"It's very useful for us to look into the agenda. You made everything easy! thanks a lot!"*
> — **Varshh ♚**

> *"Appreciate your work Prateek, it is very helpful. Thank you very much. 🙏"*
> — **Ch. hanumanprasad**

> *"Thanks Prateek! This is really helpful."*
> — **Kashif**

> *"I refer your link first daily to keep track of lectures... very useful ..thanks for yr time and efforts..."*
> *"I have shared prateek work in other group ..they are loving it there..."*
> — **Dr. Abhijit Singh**

> *"Super Thanks a Lot, for all of us!"*
> — **SV**

> *"We really appreciate your effort, Prateek. 👏"*  
> — **RJ**

> *"Awesome very useful. Thanks for the great work 🙂"*  
> — **Sanjeev**

---

## 👥 Community Contributions

The project has also inspired community-built extensions:

- **Android Companion App:** Independently developed and maintained by **RajKisan**, extending the platform with native Android features such as class notifications and mobile access.

---

## 👏 Acknowledgments

Special thanks to the IIT Patna M.Tech community for the feedback, feature suggestions, testing, and encouragement that helped shape and improve the platform.

This includes suggestions around attendance tracking, faculty mappings, timetable improvements, resources, and other community-driven enhancements.

---

## 🚀 Usage & Deployment

### Run Locally

Open `index.html` in a modern web browser.

### Deploy with Vercel or GitHub Pages

1. Push the repository to GitHub.
2. For **GitHub Pages**, go to **Settings → Pages** and deploy from the `main` branch.
3. For **Vercel**, import the repository and deploy.

---

## ⚙️ Updating the Timetable

Timetable data, including courses, schedules, and assignments, is now managed dynamically via the centralized **Timetable Admin Panel** and stored in MongoDB.

The local `js/courses.js` file serves as a fallback when the dynamic API is unreachable:

- `COURSES` — course names, faculty mappings, meeting links, and course information.
- `SCHEDULE` — days, time slots, course IDs, and lab details.

Programme-specific configurations can be managed centrally by the administrators and instantly reflect on the platform without requiring code redeployment.

---

## ⚠️ Disclaimer

Timetable information, meeting links, and course resources are compiled from schedules and information shared through student communication channels. Some information may change without notice.

Always verify schedule changes, course information, and official announcements with **IIT Patna academic communications** before relying on the information provided by this platform.
