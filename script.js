function addTask() {
  const taskInput = document.getElementById("taskInput");
  const taskText = taskInput.value.trim();

  if (taskText === "") {
    alert("Please enter a task!");
    return;
  }

  const taskList = document.getElementById("taskList");
  const li = document.createElement("li");

  li.innerHTML = `
    <span onclick="toggleTask(this)">${taskText}</span>
    <button onclick="deleteTask(this)">✖</button>
  `;

  taskList.appendChild(li);
  taskInput.value = "";
}

function toggleTask(element) {
  element.parentElement.classList.toggle("completed");
}

function deleteTask(element) {
  element.parentElement.remove();
}

// Add task on Enter key press
document.getElementById("taskInput").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    addTask();
  }
});
