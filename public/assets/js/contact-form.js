// /public/assets/js/contact-form.js
(function () {
  async function sendToContactAPI(payload) {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
  }

  // Main contact section form (parent/phone/email/dancer/interest/message)
  const messageForm = document.getElementById("message-form");
  const messageResponse = document.getElementById("form-response");
  if (messageForm) {
    messageForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true; submit.textContent = "Sending...";

      try {
        const payload = {
          parent:   form.parent.value,
          phone:    form.phone.value,
          email:    form.email.value,
          dancer:   form.dancer.value,
          interest: form.interest.value,
          message:  form.message.value,
        };
        await sendToContactAPI(payload);
        form.reset();
        messageResponse?.classList.remove("hidden");
        submit.textContent = "Send Message";
      } catch (err) {
        alert(err.message || "Couldn’t send. Please try again.");
        submit.disabled = false; submit.textContent = "Send Message";
      }
    });
  }

  // Modal’s simple form (name/email/message) — map name -> parent
  const modalForm = document.getElementById("contact-form");
  const modalThanks = document.getElementById("form-response");
  if (modalForm) {
    modalForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true; submit.textContent = "Sending...";

      try {
        const payload = {
          parent:  form.name.value,   // map to server’s expected field
          phone:   "",                // optional
          email:   form.email.value,
          dancer:  "",
          interest:"",
          message: form.message.value,
        };
        await sendToContactAPI(payload);
        form.reset();
        modalThanks?.classList.remove("hidden");
        submit.textContent = "Send Message";

        // auto-close modal after a moment if you want
        setTimeout(() => {
          const popup = document.getElementById("popup-form");
          popup?.classList.add("hidden");
          popup?.classList.remove("flex");
          modalThanks?.classList.add("hidden");
        }, 2500);
      } catch (err) {
        alert(err.message || "Couldn’t send. Please try again.");
        submit.disabled = false; submit.textContent = "Send Message";
      }
    });
  }
})();