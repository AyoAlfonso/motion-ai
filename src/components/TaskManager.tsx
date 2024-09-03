import React, {
  useState,
  useEffect,
  ChangeEvent,
  FormEvent,
  MouseEvent,
} from "react";
import { X, Calendar, Clock, AlertCircle } from "lucide-react";

// Utility function to generate time slots
const generateTimeSlots = (startHour = 9, endHour = 17): string[] => {
  const slots: string[] = [];
  for (let hour = startHour; hour < endHour; hour++) {
    slots.push(`${hour}:00`);
    slots.push(`${hour}:30`);
  }
  return slots;
};

// Define TypeScript interfaces for task and schedule
interface Task {
  id: number;
  title: string;
  duration: number;
  importance: "ASAP" | "High" | "Average" | "Low";
  priority: "ASAP" | "Hard deadline" | "Soft deadline" | "No deadline";
  deadline: string;
}

type Schedule = Record<string, Record<string, Task>>;

const TaskManager: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedule, setSchedule] = useState<Schedule>({});
  const [newTask, setNewTask] = useState<Omit<Task, "id">>({
    title: "",
    duration: 30,
    importance: "Average",
    priority: "Soft deadline",
    deadline: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    const storedTasksString = localStorage.getItem("tasks");
    const storedTasks = storedTasksString ? JSON.parse(storedTasksString) : [];
    setTasks(storedTasks);
  }, []);

  useEffect(() => {
    tasks.length && localStorage.setItem("tasks", JSON.stringify(tasks));
    if (tasks.length > 0) {
      const newSchedule = generateSchedule(tasks);
      setSchedule(newSchedule);
      localStorage.setItem("schedule", JSON.stringify(newSchedule));
    }
  }, [tasks]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setNewTask((prev) => ({ ...prev, [name]: value }));
  };

  const addTask = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const taskWithId: Task = { ...newTask, id: Date.now() };
    setTasks((prev) => [...prev, taskWithId]);
    setNewTask({
      title: "",
      duration: 30,
      importance: "Average",
      priority: "Soft deadline",
      deadline: new Date().toISOString().split("T")[0],
    });
  };

  const deleteTask = (id: number) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  // Scheduling algorithm
  const generateSchedule = (tasks: Task[]): Schedule => {
    const priorityOrder: Record<string, number> = {
      ASAP: 0,
      "Hard deadline": 1,
      "Soft deadline": 2,
      "No deadline": 3,
    };
    const importanceOrder: Record<string, number> = {
      ASAP: 0,
      High: 1,
      Average: 2,
      Low: 3,
    };

    // Sort tasks by priority, importance, and deadline
    const sortedTasks = [...tasks].sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      if (importanceOrder[a.importance] !== importanceOrder[b.importance]) {
        return importanceOrder[a.importance] - importanceOrder[b.importance];
      }
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

    const schedule: Schedule = {};
    const timeSlots = generateTimeSlots();
    let currentDate = new Date();
    let currentSlotIndex = 0;

    sortedTasks.forEach((task) => {
      const taskDuration = task.duration;
      const slotsNeeded = Math.ceil(taskDuration / 30);

      let scheduled = false;
      while (!scheduled) {
        const dateString = currentDate.toISOString().split("T")[0];
        if (!schedule[dateString]) {
          schedule[dateString] = {};
        }

        let availableSlots = 0;
        for (let i = currentSlotIndex; i < timeSlots.length; i++) {
          if (!schedule[dateString][timeSlots[i]]) {
            availableSlots++;
            if (availableSlots === slotsNeeded) {
              // Schedule the task
              for (let j = i - availableSlots + 1; j <= i; j++) {
                schedule[dateString][timeSlots[j]] = task;
              }
              scheduled = true;
              currentSlotIndex = i + 1;
              break;
            }
          } else {
            availableSlots = 0;
          }
        }

        if (!scheduled) {
          // Move to the next day
          currentDate.setDate(currentDate.getDate() + 1);
          currentSlotIndex = 0;
        }
      }
    });

    return schedule;
  };

  const renderSchedule = () => {
    return Object.entries(schedule).map(([date, slots]) => (
      <div key={date} className="mb-4">
        <h3 className="font-bold">{date}</h3>
        {Object.entries(slots).map(([time, task]) => (
          <div key={`${date}-${time}`} className="ml-4">
            <span className="font-semibold">{time}</span>: {task.title}
          </div>
        ))}
      </div>
    ));
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Advanced Task Manager</h1>

      <form onSubmit={addTask} className="mb-8 p-4 bg-gray-100 rounded-lg">
        <div className="flex flex-wrap -mx-2">
          <div className="px-2 w-full md:w-1/2 mb-4">
            <label className="block mb-1">Task Title</label>
            <input
              type="text"
              name="title"
              value={newTask.title}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="px-2 w-full md:w-1/2 mb-4">
            <label className="block mb-1">Duration (minutes)</label>
            <input
              type="number"
              name="duration"
              value={newTask.duration}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              min="1"
              required
            />
          </div>
          <div className="px-2 w-full md:w-1/2 mb-4">
            <label className="block mb-1">Importance</label>
            <select
              name="importance"
              value={newTask.importance}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="ASAP">ASAP</option>
              <option value="High">High</option>
              <option value="Average">Average</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div className="px-2 w-full md:w-1/2 mb-4">
            <label className="block mb-1">Priority</label>
            <select
              name="priority"
              value={newTask.priority}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="ASAP">ASAP</option>
              <option value="Hard deadline">Hard deadline</option>
              <option value="Soft deadline">Soft deadline</option>
              <option value="No deadline">No deadline</option>
            </select>
          </div>
          <div className="px-2 w-full mb-4">
            <label className="block mb-1">Deadline</label>
            <input
              type="date"
              name="deadline"
              value={newTask.deadline}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Task
        </button>
      </form>

      <div className="flex flex-wrap -mx-4">
        <div className="w-full md:w-1/2 px-4 mb-8">
          <h2 className="text-xl font-semibold mb-4">Task List</h2>
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white p-4 rounded-lg shadow mb-4 flex justify-between items-center"
            >
              <div>
                <h3 className="font-bold">{task.title}</h3>
                <p className="text-sm text-gray-600">
                  <Clock className="inline-block mr-1" size={16} />{" "}
                  {task.duration} min
                  <Calendar className="inline-block ml-4 mr-1" size={16} />{" "}
                  {task.deadline}
                  <AlertCircle
                    className="inline-block ml-4 mr-1"
                    size={16}
                  />{" "}
                  {task.importance}
                </p>
              </div>
              <button
                onClick={(e: MouseEvent<HTMLButtonElement>) =>
                  deleteTask(task.id)
                }
                className="text-red-500 hover:text-red-700"
              >
                <X size={24} />
              </button>
            </div>
          ))}
        </div>

        <div className="w-full md:w-1/2 px-4">
          <h2 className="text-xl font-semibold mb-4">Automated Schedule</h2>
          <div className="bg-white p-4 rounded-lg shadow">
            {renderSchedule()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskManager;
