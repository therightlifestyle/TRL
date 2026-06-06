// ===== SUPABASE CONFIG =====
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_KEY = "YOUR_PUBLIC_ANON_KEY";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== LOGIN FUNCTION =====
async function loginUser() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
  } else {
    window.location.href = "dashboard.html";
  }
}

// ===== CHECK AUTH (PROTECT PAGE) =====
async function protectPage() {
  const { data } = await supabaseClient.auth.getSession();

  if (!data.session) {
    window.location.href = "login.html";
  }
}

// ===== LOGOUT =====
async function logoutUser() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}
