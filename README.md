# 🟣 MyPlan - Next Gen Personal Productivity Space

**MyPlan** 是一个基于 **React + Tailwind CSS** 构建的现代化个人生产力工具。

它不仅仅是一个简单的待办清单，而是融合了 **GTD (Getting Things Done)**、**时间块管理 (Time Blocking)** 和 **习惯养成 (Habit Tracking)** 的全能工作台。

> 💡 **设计理念：** 拒绝伪 Deadline 焦虑，让任务管理回归“执行”本身。通过可视化的时间轴和自动化的回收机制，帮助高效能人士掌控每一天。

---

## ✨ 核心亮点 (Core Features)

### 1. 🎯 独特的双日期逻辑 (Do Date vs. Deadline)
大多数 App 只有一个日期，而 MyPlan 将其拆分为二：
*   **截止日期 (Deadline):** 任务必须完成的死线。
*   **执行日期 (Do Date):** 你计划做这件事的那一天。
*   **智能校验:** 当你安排的执行时间晚于死线时，系统会弹出红色警告，防止逾期风险。
- **注意**：只有当设置Do Date时才会显示到日程表中（无论列表模式还是时间轴模式），没有设置Do Date则这个task仅仅是一个待办，你可以在待办池、待办、分类里看到它

<img width="679" height="970" alt="Image" src="https://github.com/user-attachments/assets/04b394b4-b944-4121-a179-26fb4921fdfa" />
<img width="695" height="1019" alt="Image" src="https://github.com/user-attachments/assets/72cb0335-43f5-4384-aa5c-1556a2cca801" />

### 2. 🔄 每日回顾与自动回收 (Auto-Recycle)
*   **告别堆积:** 昨天没做完的任务不会悄悄变成红色的“过期”列表让你焦虑。
*   **每日仪式:** 每天打开 App，系统会自动检测昨日未完成任务，并弹窗建议你将其“一键退回待办池”，等待重新安排。
  <img width="1459" height="842" alt="Image" src="https://github.com/user-attachments/assets/40918949-df23-4f7f-9bc2-6e87bd7170c2" />

### 3. 📅 沉浸式日程管理 (Timeline Calendar)
*   **双视图切换:** 支持 **列表模式** 和 **时间轴模式 (Time Blocking)**。
*   **待办池联动:** 右侧常驻“待办池 (Backlog)”，你可以像玩积木一样，将任务直接 **拖拽** 到中间的时间轴上，自动定好时间和日期。
*   **双向拖拽:**
    *   `待办 -> 时间轴`: 安排任务。
    *   `时间轴 -> 时间轴`: 调整时间。
    *   `时间轴 -> 待办`: 取消安排（放回池子）。
1. 待办页面你可以看到所有的计划，没有安排具体时间的计划显示在上方，下方为已有do date的计划时间排序；
2. 你可以直接点击待办池计划里“闪电”符号，将计划安排到今天；
   <img width="1800" height="996" alt="Image" src="https://github.com/user-attachments/assets/8e03b08d-7929-4d05-98de-228f9d835887" />
3. 也可以在日程页面，将待办池中的计划拖入到列表视图/时间轴视图的上方（待办）/时间轴（自动设置为30分钟）；
   <img width="1842" height="702" alt="Image" src="https://github.com/user-attachments/assets/5ace2a71-fb2b-48c1-bb18-ad516f620c04" />
   <img width="1836" height="803" alt="Image" src="https://github.com/user-attachments/assets/87eb8ece-fb38-4523-b2e7-cc812e1b7891" />
4. 如果当日计划过多，可以快捷的从计划拖回到待办池

### 4. 🔥 习惯养成系统 (Habit Tracking)
*   **独立维度:** 习惯不同于任务，它记录的是“坚持”。
*   **多维视图:** 支持 **周视图**、**月视图** 和 **年视图热力图**。
*   **日程融合:** 习惯卡片会自动映射到当天的日程表中，你可以在日程里直接打卡，无需切换页面。
  1. 你可以在习惯页面/分类页面/日程页面创建习惯
  2. 习惯页面可以看到热力图，可以自行补签
  3. 日程页面也可以直接打卡
  <img width="703" height="771" alt="Image" src="https://github.com/user-attachments/assets/072f0cd5-7e5c-4c90-b09e-4a2408265731" />
  <img width="1468" height="542" alt="Image" src="https://github.com/user-attachments/assets/66e44698-89fe-455a-a567-41a8ae3a2878" />
  <img width="1457" height="659" alt="Image" src="https://github.com/user-attachments/assets/d464af5a-f5d9-4681-a9fc-661965a12457" />
    
### 5. 🗂 领域分类视图 (Domain View)
*   在“分类”页面，你看到的不仅仅是任务列表。
*   **混合排版:** 每个分类（如“英语学习”）下，顶部展示该领域的**长期习惯**（如“背单词”），下方展示**待办任务**（如“买参考书”）。这是一个真正的项目管理视角。
<img width="1433" height="929" alt="Image" src="https://github.com/user-attachments/assets/7a233476-0c4a-4625-bd60-7131eac8af03" />

### 6. 🛡 本地优先 (Local-First & Privacy)
*   无需注册登录，所有数据存储在本地浏览器 (LocalStorage)。
*   支持一键重置/清除数据，隐私完全掌握在自己手中。

* **注意**：如果将浏览器数据清空，则计划将**全部消失！** **建议清空浏览器之前将数据导出，之后再导入回来**
---

## 🛠 技术栈 (Tech Stack)

*   **Frontend Framework:** [React 18](https://reactjs.org/) (Vite)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Icons:** [Lucide React](https://lucide.dev/)
*   **Language:** TypeScript
*   **Drag & Drop:** Native HTML5 Drag and Drop API (No heavy libraries)
*   **Date Handling:** Native Date Object (Lightweight)


---

## 📖 使用指南 (User Guide)

### 🟢 基础工作流
1.  **收集 (Capture):** 点击右上角 `+ 新建`，将脑子里的想法丢入“待办池”，不需要马上定时间。
2.  **整理 (Organize):** 进入“分类页面”，为任务打上标签，或者创建相关的长期习惯。
3.  **计划 (Plan):**
    *   进入“日程页面”，打开右侧待办栏。
    *   将任务拖拽到今天的时间轴上，安排具体的执行时间。
4.  **执行 (Execute):**
    *   看着时间轴工作。
    *   完成任务打钩 ✅。
    *   完成习惯打卡 🔥。
5.  **回顾 (Review):**
    *   第二天早上，处理昨日未完成的任务（退回待办池或重新安排）。
    *   在“习惯页面”查看年度热力图，感受坚持的力量。

### ⌨️ 交互细节
*   **拖拽习惯:** 你甚至可以将顶部的“全天习惯”拖入时间轴，将其转化为一个具体时刻的提醒。
*   **修改昵称:** 点击左下角的 User Name，可以修改你的昵称或重置 App 数据。

---


## 🤝 贡献 (Contributing)

这是一个个人开源项目，欢迎提交 Issue 或 Pull Request 来改进它！

1.  欢迎star本项目
2.  Fork 本仓库
3.  创建你的 Feature 分支 (`git checkout -b feature/AmazingFeature`)
4.  提交你的修改 (`git commit -m 'Add some AmazingFeature'`)
5.  推送到分支 (`git push origin feature/AmazingFeature`)
6.  开启一个 Pull Request


