document.addEventListener('DOMContentLoaded', () => {
  const taskInput = document.getElementById('taskInput');
  const dueDateInput = document.getElementById('dueDateInput');
  const addTaskBtn = document.getElementById('addTaskBtn');
  const taskList = document.getElementById('taskList');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const themeToggle = document.getElementById('themeToggle');

  // Load tasks and theme from local storage
  let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
  let currentFilter = 'all';
  let currentTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  themeToggle.textContent = currentTheme === 'light' ? '🌙' : '☀️';

  // Render tasks on page load
  renderTasks();

  // Toggle theme
  themeToggle.addEventListener('click', () => {
      currentTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', currentTheme);
      themeToggle.textContent = currentTheme === 'light' ? '🌙' : '☀️';
      localStorage.setItem('theme', currentTheme);
  });

  // Add task on button click
  addTaskBtn.addEventListener('click', addTask);

  // Add task on Enter key press
  taskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addTask();
  });

  // Filter tasks
  filterButtons.forEach(button => {
      button.addEventListener('click', () => {
          filterButtons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');
          currentFilter = button.dataset.filter;
          renderTasks();
      });
  });

  // Drag-and-drop functionality
  taskList.addEventListener('dragstart', (e) => {
      const taskItem = e.target.closest('.task-item');
      if (taskItem && taskItem.draggable) {
          taskItem.classList.add('dragging');
          e.dataTransfer.setData('text/plain', taskItem.dataset.id);
      }
  });

  taskList.addEventListener('dragend', (e) => {
      const taskItem = e.target.closest('.task-item');
      if (taskItem) taskItem.classList.remove('dragging');
  });

  taskList.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(taskList, e.clientY);
      const draggable = document.querySelector('.dragging');
      if (draggable && afterElement == null) {
          taskList.appendChild(draggable);
      } else if (draggable) {
          taskList.insertBefore(draggable, afterElement);
      }
  });

  taskList.addEventListener('drop', (e) => {
      e.preventDefault();
      const id = parseInt(e.dataTransfer.getData('text/plain'));
      const draggableIndex = tasks.findIndex(task => task.id === id);
      const afterElement = getDragAfterElement(taskList, e.clientY);
      const afterIndex = afterElement ? tasks.findIndex(task => task.id === parseInt(afterElement.dataset.id)) : tasks.length;
      const [draggedTask] = tasks.splice(draggableIndex, 1);
      tasks.splice(afterIndex, 0, draggedTask);
      saveTasks();
      renderTasks();
  });

  function getDragAfterElement(container, y) {
      const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];
      return draggableElements.reduce((closest, child) => {
          const box = child.getBoundingClientRect();
          const offset = y - box.top - box.height / 2;
          if (offset < 0 && offset > closest.offset) {
              return { offset: offset, element: child };
          } else {
              return closest;
          }
      }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  function addTask() {
      const taskText = taskInput.value.trim();
      const dueDate = dueDateInput.value;
      if (taskText === '') return;

      const task = {
          id: Date.now(),
          text: taskText,
          dueDate: dueDate || null,
          completed: false
      };

      tasks.push(task);
      saveTasks();
      renderTasks();
      taskInput.value = '';
      dueDateInput.value = '';
  }

  function renderTasks() {
      taskList.innerHTML = '';
      let filteredTasks = tasks;
      if (currentFilter === 'active') {
          filteredTasks = tasks.filter(task => !task.completed);
      } else if (currentFilter === 'completed') {
          filteredTasks = tasks.filter(task => task.completed);
      }

      filteredTasks.forEach(task => {
          const li = document.createElement('li');
          li.className = 'task-item';
          li.dataset.id = task.id;
          li.draggable = true;
          const formattedDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
          li.innerHTML = `
              <span class="task-check ${task.completed ? 'checked' : ''}" aria-checked="${task.completed}" role="checkbox" onclick="toggleTask(${task.id})">${task.completed ? '✅' : ''}</span>
              <div class="task-content">
                  <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
                  <span class="task-due-date">Due: ${formattedDate}</span>
              </div>
              <button class="edit-btn" onclick="editTask(${task.id})">Edit</button>
              <button class="delete-btn" onclick="deleteTask(${task.id})">Delete</button>
          `;
          taskList.appendChild(li);
      });
  }

  window.toggleTask = (id) => {
      const task = tasks.find(t => t.id === id);
      task.completed = !task.completed;
      saveTasks();
      renderTasks();
  };

  window.editTask = (id) => {
      const task = tasks.find(t => t.id === id);
      const taskItem = Array.from(taskList.children).find(item => 
          item.dataset.id == id
      );

      taskItem.innerHTML = `
          <div class="task-content">
              <input type="text" class="edit-input" value="${task.text}">
              <input type="date" class="edit-due-date" value="${task.dueDate || ''}">
          </div>
          <button class="save-btn" onclick="saveTask(${task.id}, this)">Save</button>
          <button class="delete-btn" onclick="deleteTask(${task.id})">Delete</button>
      `;
      taskItem.draggable = false;

      const editInput = taskItem.querySelector('.edit-input');
      const editDueDate = taskItem.querySelector('.edit-due-date');
      const saveBtn = taskItem.querySelector('.save-btn');

      // Save on Enter key for task text input
      editInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
              saveTask(id, saveBtn);
          }
      });

      // Save on Enter key for due date input
      editDueDate.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
              saveTask(id, saveBtn);
          }
      });

      editInput.focus();
  };

  window.saveTask = (id, button) => {
      const taskItem = button.parentElement;
      const newText = taskItem.querySelector('.edit-input').value.trim();
      const newDueDate = taskItem.querySelector('.edit-due-date').value;
      if (newText === '') return;

      const task = tasks.find(t => t.id === id);
      task.text = newText;
      task.dueDate = newDueDate || null;
      saveTasks();
      renderTasks();
  };

  window.deleteTask = (id) => {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      renderTasks();
  };

  function saveTasks() {
      localStorage.setItem('tasks', JSON.stringify(tasks));
  }
});