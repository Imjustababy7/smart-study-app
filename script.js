const firebaseConfig = {
  apiKey: "AIzaSyAsl9t9TmvUVN7JTK_i-n8GOa6eHu5yh74",
  authDomain: "smartstudy-db84f.firebaseapp.com",
  projectId: "smartstudy-db84f",
  storageBucket: "smartstudy-db84f.firebasestorage.app",
  messagingSenderId: "660793219495",
  appId: "1:660793219495:web:b91f5305be19859d74be82"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let quizIndex = 0;
let quizData = [];
let quizScore = 0;

// Shortcuts
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");

// Register
async function register() {
  const email = emailEl.value;
  const password = passwordEl.value;
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  await db.collection("users").doc(cred.user.uid).set({
    email: cred.user.email,
    role: "student"
  });
  alert("Registered. Now login.");
}

// Login
async function login() {
  const email = emailEl.value;
  const password = passwordEl.value;
  const cred = await auth.signInWithEmailAndPassword(email, password);
  const docSnap = await db.collection("users").doc(cred.user.uid).get();

  if (!docSnap.exists) {
    alert("❌ User record not found.");
    return;
  }

  const data = docSnap.data();
  const role = data.role;
  showSections(role, cred.user.email);
  loadNotes();
  loadQuiz();
}

// Show/hide UI
function showSections(role, email) {
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("user-section").style.display = "block";
  document.getElementById("notes-section").style.display = "block";
  document.getElementById("quiz-section").style.display = "block";
  document.getElementById("user-info").textContent = `${email} (${role})`;

  document.getElementById("admin-panel").style.display = (role === "admin") ? "block" : "none";
  document.getElementById("quiz-upload").style.display = (role === "admin") ? "block" : "none";

  if (role === "admin") {
    document.getElementById("score-board").style.display = "block";
    loadScores();
  }
}

// Logout
function logout() {
  auth.signOut();
  location.reload();
}

// Add Note
async function addNote() {
  const title = document.getElementById("note-title").value;
  const subject = document.getElementById("note-subject").value;
  const content = document.getElementById("note-content").value;

  await db.collection("notes").add({ title, subject, content });
  document.getElementById("admin-message").textContent = "✅ Note Added";
  loadNotes();
}

// Load Notes
function loadNotes() {
  db.collection("notes").get().then(snapshot => {
    const container = document.getElementById("notes-container");
    container.innerHTML = "";
    snapshot.forEach(doc => {
      const note = doc.data();
      container.innerHTML += `<div><strong>${note.title}</strong> (${note.subject}):<br>${note.content}</div><hr>`;
    });
  });
}

// Upload Quiz
async function uploadQuiz() {
  const question = document.getElementById("quiz-question").value;
  const options = document.getElementById("quiz-options").value.split(",").map(opt => opt.trim());
  const answer = document.getElementById("quiz-answer").value.trim();
  const subject = document.getElementById("quiz-subject").value;

  await db.collection("quizzes").add({ question, options, answer, subject });
  alert("✅ Quiz Uploaded");
  loadQuiz();
}

// Load Quiz
function loadQuiz() {
  db.collection("quizzes").get().then(snapshot => {
    quizData = snapshot.docs.map(doc => doc.data());
  });
}

// Start Quiz
function startQuiz() {
  quizIndex = 0;
  quizScore = 0;
  document.getElementById("quiz-box").style.display = "block";
  showQuestion();
}

function showQuestion() {
  const q = quizData[quizIndex];
  document.getElementById("quiz-question-text").textContent = q.question;
  const container = document.getElementById("quiz-options-container");
  container.innerHTML = "";
  q.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.onclick = () => {
      if (opt.trim().toLowerCase() === q.answer.trim().toLowerCase()) quizScore++;
      nextQuestion();
    };
    container.appendChild(btn);
  });
}

async function nextQuestion() {
  quizIndex++;
  if (quizIndex < quizData.length) {
    showQuestion();
  } else {
    // ✅ Save score to Firestore
    await db.collection("scores").add({
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      score: quizScore,
      total: quizData.length,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    document.getElementById("quiz-box").style.display = "none";
    document.getElementById("quiz-result").textContent = `You scored ${quizScore} out of ${quizData.length}`;
  }
}

// ✅ Load scores for admin
async function loadScores() {
  const container = document.getElementById("score-list");
  container.innerHTML = "Loading...";

  const snapshot = await db.collection("scores")
    .orderBy("timestamp", "desc")
    .limit(20)
    .get();

  container.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    const time = data.timestamp?.toDate().toLocaleString() || "Unknown time";
    container.innerHTML += `<p><strong>${data.email}</strong>: ${data.score}/${data.total} — ${time}</p>`;
  });
}
