const STORAGE_KEY = "xhs-mini-tool.tasks.v1";
const MAX_TASK_LENGTH = 60;

const input = document.querySelector("#task-input");
const addButton = document.querySelector("#add-button");
const clearButton = document.querySelector("#clear-button");
const list = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const inputError = document.querySelector("#input-error");
const storageError = document.querySelector("#storage-error");
const taskTemplate = document.querySelector("#task-template");

let tasks = loadTasks();

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showStorageError(message) {
  storageError.textContent = message;
  storageError.hidden = !message;
}

function normalizeTask(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const text = typeof value.text === "string" ? value.text.trim() : "";
  if (!text) {
    return null;
  }

  return {
    id: typeof value.id === "string" && value.id ? value.id : createId(),
    text: text.slice(0, MAX_TASK_LENGTH),
    completed: value.completed === true,
  };
}

function loadTasks() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) {
      return [];
    }

    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      showStorageError("本地任务格式异常，已使用空列表。");
      return [];
    }

    const normalized = parsed.map(normalizeTask).filter(Boolean);
    if (normalized.length !== parsed.length) {
      showStorageError("部分本地任务格式异常，已自动忽略。");
    }
    return normalized;
  } catch (error) {
    console.warn("无法读取本地任务，已使用空列表。", error);
    showStorageError("无法读取本地任务，已使用空列表。");
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    showStorageError("");
    return true;
  } catch (error) {
    console.warn("无法保存本地任务。", error);
    showStorageError("保存失败：本次更改可能无法在下次打开时恢复。");
    return false;
  }
}

function showInputError(message) {
  inputError.textContent = message;
  inputError.hidden = !message;
}

function addTask() {
  const text = input.value.trim();
  if (!text) {
    showInputError("请输入任务内容。");
    input.focus();
    return;
  }

  tasks.unshift({ id: createId(), text, completed: false });
  saveTasks();
  input.value = "";
  showInputError("");
  render();
  input.focus();
}

function toggleTask(id, completed) {
  tasks = tasks.map((task) => task.id === id ? { ...task, completed } : task);
  saveTasks();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  saveTasks();
  render();
}

function clearCompleted() {
  const nextTasks = tasks.filter((task) => !task.completed);
  if (nextTasks.length === tasks.length) {
    return;
  }
  tasks = nextTasks;
  saveTasks();
  render();
}

function renderTask(task) {
  const fragment = taskTemplate.content.cloneNode(true);
  const item = fragment.querySelector(".task-item");
  const checkbox = fragment.querySelector(".task-checkbox");
  const text = fragment.querySelector(".task-text");
  const deleteButton = fragment.querySelector(".delete-button");

  item.dataset.completed = String(task.completed);
  checkbox.checked = task.completed;
  checkbox.addEventListener("change", () => toggleTask(task.id, checkbox.checked));
  text.textContent = task.text;
  deleteButton.setAttribute("aria-label", `删除任务：${task.text}`);
  deleteButton.addEventListener("click", () => deleteTask(task.id));

  return fragment;
}

function render() {
  list.replaceChildren();
  tasks.forEach((task) => list.append(renderTask(task)));
  emptyState.hidden = tasks.length > 0;
  clearButton.disabled = !tasks.some((task) => task.completed);
}

addButton.addEventListener("click", addTask);
clearButton.addEventListener("click", clearCompleted);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addTask();
  }
});
input.addEventListener("input", () => showInputError(""));

render();
