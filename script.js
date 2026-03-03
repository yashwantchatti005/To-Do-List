function addTask() {
  const taskInput = document.getElementById("taskInput");
  const taskText = taskInput.value.trim();
  
  if (taskText === "") {
    // Subtle shake animation could go here
    taskInput.placeholder = "Please enter something!";
    return;
  }

  const taskList = document.getElementById("taskList");
  const li = document.createElement("li");
  
  li.innerHTML = `
    <span onclick="toggleTask(this)">${taskText}</span>
    <button class="delete-btn" onclick="deleteTask(this)">✕</button>
  `;

  taskList.appendChild(li);
  taskInput.value = "";
  taskInput.placeholder = "What's next?";
}

function toggleTask(element) {
  element.parentElement.classList.toggle("completed");
}

function deleteTask(element) {
  const item = element.parentElement;
  // Apply the 'fall' animation class
  item.classList.add("fall");
  
  // Wait for animation to finish before removing
  item.addEventListener("transitionend", () => {
    item.remove();
  });
}

// Enter key support
document.getElementById("taskInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") addTask();
});
