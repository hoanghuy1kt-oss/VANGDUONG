const fs = require("fs");
const path = require("path");

async function testUpload() {
  const filePath = path.join(__dirname, "public", "next.svg");
  const buffer = fs.readFileSync(filePath);
  const blob = new Blob([buffer], { type: "image/svg+xml" });
  
  const formData = new FormData();
  formData.append("file", blob, "test-next-logo.svg");
  formData.append("projectCode", "TEST");

  console.log("Ðang g?i API Vercel...");
  try {
    const res = await fetch("https://vangduong.vercel.app/api/upload", {
      method: "POST",
      body: formData
    });
    
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}

testUpload();
