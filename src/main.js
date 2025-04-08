import "../src/style.scss";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../src/firebaseConfig.js";

// Auto-expand textarea
const textarea = document.getElementById("input-box");
const addButton = document.getElementById("add-button");
const inputContainer = document.getElementById("input-container");
const submitButton = document.getElementById("submit-input-button");

textarea.addEventListener("input", () => {
  textarea.style.height = "auto";
  textarea.style.height = textarea.scrollHeight + "px";
});

addButton.addEventListener("click", () => {
  inputContainer.style.visibility = "visible";
});

document.addEventListener("click", (e) => {
  if (
    inputContainer.style.visibility === "visible" &&
    !inputContainer.contains(e.target) &&
    !addButton.contains(e.target)
  ) {
    inputContainer.style.visibility = "hidden";
  }
});

// Reusable function to enable editing a note message
const makeEditable = (element, noteId) => {
  element.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = element.textContent;
    input.style.width = element.offsetWidth + "px";

    element.replaceWith(input);
    input.focus();

    const save = async () => {
      const newText = input.value;
      const newDiv = document.createElement("div");
      newDiv.className = "note-message";
      newDiv.textContent = newText;

      makeEditable(newDiv, noteId); // reattach listener
      input.replaceWith(newDiv);

      // Firestore update
      try {
        await updateDoc(doc(db, "note", noteId), {
          message: newText,
        });
        console.log("Note updated in Firestore:", noteId);
      } catch (err) {
        console.error("Failed to update note in Firestore:", err);
      }
    };

    input.addEventListener("blur", save);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") save();
    });
  });
};

// Create and append a note element
const appendNoteElement = (noteApp, note) => {
  const noteElement = document.createElement("div");
  noteElement.className = "note-element";
  noteElement.setAttribute("data-id", note.id);

  noteElement.innerHTML = `
    <div class="read-container">
      <div class="date-time-container">
        <div class="date">${note.date}</div>
        <div class="time">${note.time.toLowerCase()}</div>
      </div>
      <div class="note-message">${note.message}</div>
    </div>
    <img class="delete-button" id="${
      note.id
    }" src="./src/assets/icons/trash3-fill.svg" alt="delete" />
  `;

  noteApp.appendChild(noteElement);

  // Make the message editable
  const messageDiv = noteElement.querySelector(".note-message");
  makeEditable(messageDiv, note.id);

  // Set up delete button
  const deleteButton = document.getElementById(note.id);
  deleteButton.addEventListener("click", async () => {
    noteApp.removeChild(noteElement);
    try {
      await deleteDoc(doc(db, "note", note.id));
      console.log("Note deleted from Firestore:", note.id);
    } catch (err) {
      console.error("Failed to delete note from Firestore:", err);
    }
  });
};

// Handle note creation
submitButton.addEventListener("click", async () => {
  const inputBox = document.getElementById("input-box");
  const noteApp = document.getElementById("note-app");

  const now = new Date();
  const date = now.toLocaleDateString();
  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const message = inputBox.value;
  const timestamp = now.getTime();

  try {
    const docRef = await addDoc(collection(db, "note"), {
      date,
      time,
      message,
      timestamp,
    });

    console.log("Note saved to Firestore with ID:", docRef.id);

    appendNoteElement(noteApp, {
      id: docRef.id,
      date,
      time,
      message,
    });

    inputBox.value = "";
  } catch (e) {
    console.error("Error saving note to Firestore:", e);
  }
});

// Load notes on page load
async function loadNotesFromFirestore() {
  const noteApp = document.getElementById("note-app");

  try {
    const querySnapshot = await getDocs(collection(db, "note"));
    const notes = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      notes.push({
        id: docSnap.id,
        date: data.date,
        time: data.time,
        message: data.message,
        timestamp: data.timestamp || 0,
      });
    });

    notes.sort((a, b) => a.timestamp - b.timestamp);

    notes.forEach((note) => {
      appendNoteElement(noteApp, note);
    });
  } catch (error) {
    console.error("Error loading notes from Firestore:", error);
  }
}

window.addEventListener("DOMContentLoaded", loadNotesFromFirestore);
