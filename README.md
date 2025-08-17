# 🐾 PetAdopt – MERN Stack Pet Adoption Platform

PetAdopt is a dynamic and responsive web application built with the MERN stack that connects pet lovers with animals in need of forever homes. It empowers users to browse adoptable pets, request adoptions, create donation campaigns, and contribute to causes close to their hearts. Admins manage the platform efficiently through dedicated tools and analytics, while the design ensures accessibility, responsiveness, and aesthetic appeal.

## 🌐 Live Site

**Live:** [(https://pawhome.netlify.app)]



## 🧩 Technologies & Libraries Used

### 👨‍💻 Client-Side

- **React.js**
- **React Router**
- **TailwindCSS** 
- **Formik** + **Yup**
- **React Icons**
- **React Select**
- **TanStack Query**
- **TanStack Table**
- **React Hook Form**
- **Tiptap** (WYSIWYG editor)
- **imgbb API** for image upload
- **Stripe.js** + **Stripe Elements**
- **React Toastify**
- **React Skeleton Loader**
- **Dark/Light Mode Toggle**
- **JWT (JSON Web Token) Authentication**

### 🖥️ Server-Side

- **Node.js**
- **Express.js**
- **MongoDB** 
- **CORS**, **Cookie-Parser**
- **JWT Token Handling**
- **Dotenv** 


---

## ✨ Key Features

### 🚀 General Features

- Fully responsive (Mobile, Tablet, Desktop)
- Clean UI with modern aesthetics ( custom design with Tailwind Css )
- Dark and Light Mode toggle
- Skeleton loaders instead of spinners
- Optimized color contrast and spacing
- Secure Firebase and MongoDB environment variables

---

### 🏠 Homepage

- Eye-catching banner section
- Pet categories (Cat, Dog, Rabbit, Fish, etc.)
- Inspirational Call-to-Action section
- About Us section
- Additional themed sections

---

### 🐶 Pet Listing Page

- All unadopted pets shown in grid layout
- Infinite scrolling with `react-intersection-observer`
- Search and category filtering
- Sorted by newest first

---

### 🐾 Pet Details Page

- Full pet information
- Adopt modal with user info auto-filled
- Adoption request saved to database

---

### 💰 Donation Campaigns

- Campaign listing with infinite scroll
- Each campaign shows image, max goal, progress, and details
- Donate modal using Stripe CardElement
- Recommended donation campaigns shown below

---

### 🔒 Authentication & Authorization

- Email/password registration with name & profile image
- Google and GitHub login
- JWT stored in cookies/localStorage
- Role-based routing (Admin/User)
- Firebase Auth integration

---

### 👤 User Dashboard (Protected)

- Sidebar layout with top navbar
- Profile Avatar and dropdown
- Add Pet (Formik, Cloudinary)
- My Added Pets (TanStack Table, pagination)
- Edit & delete pet, mark as adopted
- Adoption Requests (Accept/Reject)
- Create & manage Donation Campaigns
- View donations & request refund
- Includes extra **UserProfile component**

---

### 🛡️ Admin Dashboard (Protected)

- Access to all user routes
- Manage users (Make Admin)
- View, edit, delete, pause any donation campaign
- Manage all pets and mark status

---


