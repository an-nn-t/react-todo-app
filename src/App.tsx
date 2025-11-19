import React, { useState, useEffect, useCallback, useMemo } from 'react';
// アイコンを使用するためにlucide-reactからインポートします
import { 
  Plus, Trash2, Check, X, Calendar, Clock, Flag, ListChecks, Edit, Menu, ArrowRight, Sun, AlertTriangle, ChevronsUp,
  ListOrdered, ListEnd
} from 'lucide-react';

// ====================================================================
// 1. 型定義
// ====================================================================

// 日々の計画アイテムの型
interface DailyPlanItem {
  id: number;
  date: string; // YYYY-MM-DD
  activity: string;
  completed: boolean;
}

// ToDoアイテムの型 (拡張)
interface Todo {
  id: number;
  text: string;
  completed: boolean;
  deadline: string; // メイン期限 (YYYY-MM-DD)
  subDeadline: string; // サブ期限 (YYYY-MM-DD)
  priority: 'low' | 'medium' | 'high' | 'urgent';
  memo: string;
  estimatedTime: number; // 見積もり時間 (h)
  dailyPlan: DailyPlanItem[]; // 日々の計画
}

// 優先度のラベルと色
const priorityMap: { [key in Todo['priority']]: { label: string, color: string, order: number } } = {
  urgent: { label: '緊急', color: 'bg-red-600 text-red-50', order: 4 },
  high: { label: '高', color: 'bg-orange-500 text-orange-50', order: 3 },
  medium: { label: '中', color: 'bg-yellow-500 text-yellow-50', order: 2 },
  low: { label: '低', color: 'bg-blue-500 text-blue-50', order: 1 },
};

// ====================================================================
// 2. 期限検出ヘルパー関数
// ====================================================================

// 日付文字列を比較するためのヘルパー
const dateDiffInDays = (dateString: string): number | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateString);
    targetDate.setHours(0, 0, 0, 0);

    if (isNaN(targetDate.getTime())) return null;

    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// 期限アラートを返す関数
const getDeadlineAlert = (todo: Todo): { type: 'today' | 'tomorrow' | 'soon' | 'passed' | null, date: string } | null => {
    let closestDate: string | null = null;
    let closestDiff: number | null = null;

    // 1. メイン期限とサブ期限をチェック
    const checkDates = [todo.deadline, todo.subDeadline].filter(d => d && !todo.completed);

    // 2. 未完了のDailyPlanアイテムもチェック
    if (!todo.completed) {
        todo.dailyPlan.filter(p => !p.completed).forEach(p => checkDates.push(p.date));
    }

    if (checkDates.length === 0) return null;

    // 最も近い期限を特定
    checkDates.forEach(dateString => {
        const diff = dateDiffInDays(dateString);
        if (diff !== null) {
            if (closestDiff === null || diff < closestDiff) {
                closestDiff = diff;
                closestDate = dateString;
            }
        }
    });

    if (closestDiff === null || !closestDate) return null;

    if (closestDiff < 0) {
        return { type: 'passed', date: closestDate };
    } else if (closestDiff === 0) {
        return { type: 'today', date: closestDate };
    } else if (closestDiff === 1) {
        return { type: 'tomorrow', date: closestDate };
    } else if (closestDiff <= 3) {
        return { type: 'soon', date: closestDate };
    }
    
    return null;
};

// ====================================================================
// 3. メインコンポーネント
// ====================================================================

// localStorageからの初期データ取得
const getInitialTodos = (): Todo[] => {
  const saved = localStorage.getItem('react-advanced-todos');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse todos from localStorage", e);
      return [];
    }
  }
  return [];
};

// **********************************
// 4. サブコンポーネント: 新規タスクフォーム (Appの外に分離し、メモ化)
// **********************************

interface NewTaskFormProps {
    newTodoText: string;
    setNewTodoText: (text: string) => void;
    deadlineInput: string;
    setDeadlineInput: (date: string) => void;
    subDeadlineInput: string;
    setSubDeadlineInput: (date: string) => void;
    priorityInput: Todo['priority'];
    setPriorityInput: (priority: Todo['priority']) => void;
    estimatedTimeInput: number | '';
    setEstimatedTimeInput: (time: number | '') => void;
    memoInput: string;
    setMemoInput: (memo: string) => void;
    addTodo: (e: React.FormEvent) => void;
}

const NewTaskForm = React.memo<NewTaskFormProps>(({
    newTodoText, setNewTodoText, deadlineInput, setDeadlineInput, subDeadlineInput, setSubDeadlineInput,
    priorityInput, setPriorityInput, estimatedTimeInput, setEstimatedTimeInput, memoInput, setMemoInput,
    addTodo
}) => (
    <form onSubmit={addTodo} className="space-y-4 mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-3 border-b pb-2 border-gray-200 dark:border-gray-700">新規タスク追加</h2>
      
      {/* タスク名入力 */}
      <input
        type="text"
        value={newTodoText}
        onChange={(e) => setNewTodoText(e.target.value)}
        placeholder="タスクのタイトルを入力..."
        className="w-full p-3 text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-150"
        aria-label="タスクタイトル"
      />

      {/* 期限・優先度・時間設定 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">メイン期限</label>
          <input
            type="date"
            value={deadlineInput}
            onChange={(e) => setDeadlineInput(e.target.value)}
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200"
            aria-label="メイン期限"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">サブ期限</label>
          <input
            type="date"
            value={subDeadlineInput}
            onChange={(e) => setSubDeadlineInput(e.target.value)}
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200"
            aria-label="サブ期限"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">優先度</label>
          <select
            value={priorityInput}
            onChange={(e) => setPriorityInput(e.target.value as Todo['priority'])}
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200"
            aria-label="優先度"
          >
            {Object.entries(priorityMap).map(([key, item]) => (
                <option key={key} value={key}>
                    {item.label}
                </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">所要時間 (h)</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={estimatedTimeInput}
            onChange={(e) => setEstimatedTimeInput(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="0"
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200"
            aria-label="所要時間 (時間)"
          />
        </div>
      </div>

      {/* メモ入力 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">メモ</label>
        <textarea
          value={memoInput}
          onChange={(e) => setMemoInput(e.target.value)}
          placeholder="メモや詳細情報を入力..."
          rows={2}
          className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200 resize-y"
          aria-label="メモ"
        />
      </div>

      {/* 追加ボタン */}
      <div className="flex justify-end">
        <button
          type="submit"
          className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-200 transform hover:scale-105 active:scale-95"
          aria-label="タスクを登録"
        >
          <Plus className="w-5 h-5 mr-2" />
          タスクを登録
        </button>
      </div>
    </form>
));

// **********************************
// 5. サブコンポーネント: 日々の計画エディタ (変更なし、ただしshowMessageをuseCallbackでラップする必要あり)
// **********************************
  
const PlanEditor: React.FC<{ 
    todo: Todo; 
    onSave: (updatedTodo: Todo) => void;
    showMessage: (type: 'error' | 'info', text: string) => void;
}> = ({ todo, onSave, showMessage }) => {
    // 編集中のタスクの詳細データをローカルステートとして保持
    const [localTodo, setLocalTodo] = useState<Todo>({...todo});
    const [newActivity, setNewActivity] = useState('');
    const [newDate, setNewDate] = useState('');

    // 入力フィールドの変更ハンドラ (期限、メモなどを直接更新)
    const handleInputChange = (field: keyof Todo, value: string | number) => {
        setLocalTodo(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const addPlanItem = () => {
      if (!newActivity.trim() || !newDate) {
        showMessage('error', '日付と活動内容の両方を入力してください。');
        return;
      }
      
      const newItem: DailyPlanItem = {
        id: Date.now() + Math.random(),
        date: newDate,
        activity: newActivity.trim(),
        completed: false,
      };
      
      // 日付でソートして追加
      const sortedPlan = [...localTodo.dailyPlan, newItem].sort((a, b) => a.date.localeCompare(b.date));
      
      setLocalTodo(prev => ({
          ...prev,
          dailyPlan: sortedPlan
      }));

      setNewActivity('');
      setNewDate('');
    };

    const togglePlanItem = (id: number) => {
      setLocalTodo(prev => ({
          ...prev,
          dailyPlan: prev.dailyPlan.map(item => 
              item.id === id ? { ...item, completed: !item.completed } : item
          )
      }));
    };

    const deletePlanItem = (id: number) => {
      setLocalTodo(prev => ({
          ...prev,
          dailyPlan: prev.dailyPlan.filter(item => item.id !== id)
      }));
    };

    const handleSave = () => {
      // ローカルで変更されたTodo全体を親コンポーネントに渡して保存
      onSave(localTodo);
    };

    return (
      <div className="space-y-4">
        {/* 詳細情報編集 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">メイン期限</label>
                <input
                    type="date"
                    value={localTodo.deadline}
                    onChange={(e) => handleInputChange('deadline', e.target.value)}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                    aria-label="メイン期限"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">サブ期限</label>
                <input
                    type="date"
                    value={localTodo.subDeadline}
                    onChange={(e) => handleInputChange('subDeadline', e.target.value)}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                    aria-label="サブ期限"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">優先度</label>
                <select
                    value={localTodo.priority}
                    onChange={(e) => handleInputChange('priority', e.target.value as Todo['priority'])}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                    aria-label="優先度"
                >
                    {Object.entries(priorityMap).map(([key, item]) => (
                        <option key={key} value={key}>
                            {item.label}
                        </option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">所要時間 (h)</label>
                <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={localTodo.estimatedTime || ''}
                    onChange={(e) => handleInputChange('estimatedTime', e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                    aria-label="所要時間 (時間)"
                />
            </div>
            <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">メモ</label>
                <textarea
                    value={localTodo.memo}
                    onChange={(e) => handleInputChange('memo', e.target.value)}
                    placeholder="メモや詳細情報を入力..."
                    rows={3}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200 resize-y"
                    aria-label="メモ"
                />
            </div>
        </div>
        
        <h4 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mt-6 border-b pb-2">日々の計画 (サブタスク)</h4>

        {/* 日々の計画追加フォーム */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 text-gray-800 dark:text-gray-200"
            aria-label="計画日"
          />
          <input
            type="text"
            value={newActivity}
            onChange={(e) => setNewActivity(e.target.value)}
            placeholder="活動内容を入力..."
            className="flex-grow p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 text-gray-800 dark:text-gray-200"
            aria-label="活動内容"
          />
          <button
            onClick={addPlanItem}
            type="button"
            className="flex-shrink-0 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-3 rounded-lg transition duration-150"
            aria-label="計画を追加"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* 日々の計画リスト */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {localTodo.dailyPlan.length === 0 ? (
            <p className="text-gray-500 text-sm text-center">日々の計画を追加しましょう。</p>
          ) : (
            localTodo.dailyPlan.map((item) => (
              <div 
                key={item.id} 
                className={`flex items-center p-3 rounded-lg ${
                  item.completed ? 'bg-green-50/50 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-800'
                } border border-gray-200 dark:border-gray-700`}
              >
                <button
                  onClick={() => togglePlanItem(item.id)}
                  className={`p-1 mr-3 rounded-full border transition duration-150 ${
                    item.completed
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-white border-gray-400 text-transparent hover:bg-gray-100 dark:bg-gray-900 dark:border-gray-600'
                  }`}
                  aria-label={item.completed ? '計画を未完了に戻す' : '計画を完了にする'}
                >
                  <Check className="w-4 h-4" />
                </button>
                <span className={`text-sm font-semibold mr-4 flex-shrink-0 ${item.completed ? 'text-gray-500 line-through' : 'text-indigo-600 dark:text-indigo-400'}`}>
                    {item.date}
                </span>
                <span className={`flex-grow text-gray-800 dark:text-gray-200 ${item.completed ? 'line-through text-gray-500' : ''}`}>
                  {item.activity}
                </span>
                <button
                  onClick={() => deletePlanItem(item.id)}
                  className="p-1 text-red-500 hover:text-red-700 rounded-full transition duration-150"
                  aria-label="計画を削除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-150 transform hover:scale-105"
          >
            変更を保存
          </button>
        </div>
      </div>
    );
  };


const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>(getInitialTodos);
  
  // 新規追加フォームのステート (New Task Form)
  const [newTodoText, setNewTodoText] = useState('');
  const [deadlineInput, setDeadlineInput] = useState('');
  const [subDeadlineInput, setSubDeadlineInput] = useState('');
  const [priorityInput, setPriorityInput] = useState<Todo['priority']>('medium');
  const [estimatedTimeInput, setEstimatedTimeInput] = useState<number | ''>('');
  const [memoInput, setMemoInput] = useState('');

  // レイアウトとソートのステート
  const [message, setMessage] = useState<{ type: 'error' | 'info'; text: string } | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNewTaskFormOpen, setIsNewTaskFormOpen] = useState(false); // スマホ用新規タスクフォーム開閉
  const [sortBy, setSortBy] = useState<'priority' | 'deadline'>('deadline'); // ソート基準

  // Helper: メッセージ表示とクリア (useCallbackでメモ化)
  const showMessage = useCallback((type: 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }, []); // 依存配列は空でOK

  // **********************************
  // 永続化 (localStorage)
  // **********************************

  useEffect(() => {
    localStorage.setItem('react-advanced-todos', JSON.stringify(todos));
  }, [todos]);
  
  // **********************************
  // CRUD & フォームクリア
  // **********************************

  // フォームクリアヘルパー (useCallbackでメモ化)
  const clearForm = useCallback(() => {
    setNewTodoText('');
    setDeadlineInput('');
    setSubDeadlineInput('');
    setPriorityInput('medium');
    setEstimatedTimeInput('');
    setMemoInput('');
  }, [setNewTodoText, setDeadlineInput, setSubDeadlineInput, setPriorityInput, setEstimatedTimeInput, setMemoInput]);


  // ToDoを追加する関数 (useCallbackでメモ化)
  const addTodo = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmedText = newTodoText.trim();
    if (trimmedText === '') {
      showMessage('error', 'タスクの内容を入力してください。');
      return;
    }

    const newTodo: Todo = {
      id: Date.now(),
      text: trimmedText,
      completed: false,
      deadline: deadlineInput,
      subDeadline: subDeadlineInput,
      priority: priorityInput,
      memo: memoInput,
      estimatedTime: estimatedTimeInput === '' ? 0 : Number(estimatedTimeInput),
      dailyPlan: [], 
    };

    setTodos(prevTodos => [newTodo, ...prevTodos]);
    clearForm();
    setIsNewTaskFormOpen(false); // 追加後、スマホで閉じる
    showMessage('info', 'タスクが追加されました！');
  }, [newTodoText, deadlineInput, subDeadlineInput, priorityInput, estimatedTimeInput, memoInput, clearForm, showMessage]);

  // ToDoの完了状態を切り替える関数 (変更なし)
  const toggleTodo = (id: number) => {
    setTodos(
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  // ToDoを削除する関数 (変更なし)
  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
    showMessage('info', 'タスクが削除されました。');
  };

  // **********************************
  // 詳細・計画管理 (変更なし)
  // **********************************

  const openDetailModal = (todo: Todo) => {
    setEditingTodo(todo);
    setIsDetailOpen(true);
  };

  const closeDetailModal = () => {
    setEditingTodo(null);
    setIsDetailOpen(false);
  };

  // 編集内容を保存する関数 (useCallbackでメモ化)
  const saveEditedTodo = useCallback((updatedTodo: Todo) => {
    setTodos(prevTodos => prevTodos.map(t => (t.id === updatedTodo.id ? updatedTodo : t)));
    closeDetailModal();
    showMessage('info', 'タスク詳細が更新されました。');
  }, [showMessage]);
  
  // **********************************
  // ソート機能の実装 (変更なし)
  // **********************************

  const sortedTodos = useMemo(() => {
    const sorted = [...todos];

    if (sortBy === 'priority') {
      // 優先度順: 緊急 > 高 > 中 > 低 (orderが大きい順)
      sorted.sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1; // 完了済みを下に
        }
        return priorityMap[b.priority].order - priorityMap[a.priority].order;
      });
    } else if (sortBy === 'deadline') {
      // 期限順: 最も近い期限を持つものが上
      sorted.sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1; // 完了済みを下に
        }
        
        // メイン期限、サブ期限、日々の計画の中で最も近い日付を抽出する関数
        const getClosestDate = (todo: Todo) => {
          const dates = [todo.deadline, todo.subDeadline, ...todo.dailyPlan.map(p => p.date)]
            .filter(d => d)
            .map(d => new Date(d).getTime())
            .filter(t => !isNaN(t));

          if (dates.length === 0) return Infinity; // 期限がない場合はリストの最後へ
          return Math.min(...dates);
        };

        const dateA = getClosestDate(a);
        const dateB = getClosestDate(b);

        return dateA - dateB;
      });
    }

    return sorted;
  }, [todos, sortBy]);

  // 完了したタスクの数
  const completedCount = todos.filter(todo => todo.completed).length;

  // **********************************
  // 6. メインレンダリング
  // **********************************
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-6xl mt-0 sm:mt-10">
        
        {/* ヘッダー (スマホ専用: 新規タスクボタン) */}
        <div className="sm:hidden flex justify-between items-center w-full mb-4">
            <h1 className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-400">ToDo</h1>
            <button
                onClick={() => setIsNewTaskFormOpen(!isNewTaskFormOpen)}
                className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200"
                aria-label="新規タスク追加フォームの開閉"
            >
                <Plus className="w-5 h-5 mr-1" />
                {isNewTaskFormOpen ? '閉じる' : '新規登録'}
            </button>
        </div>

        {/* PCレイアウト: Flex Row | スマホレイアウト: Single Column */}
        <div className="flex flex-col sm:flex-row gap-6">
          
          {/* 左側: ToDoリスト (PC: 2/3幅, スマホ: Full幅) */}
          <div className="sm:w-2/3 w-full order-2 sm:order-1">
            <h1 className="hidden sm:block text-4xl font-extrabold text-indigo-700 dark:text-indigo-400 mb-8 tracking-wider text-center sm:text-left">
                タスク管理 ToDo
            </h1>
            
            {/* メッセージボックス */}
            {message && (
                <div 
                    className={`p-3 mb-4 rounded-lg shadow-md ${
                        message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}
                >
                    <div className="flex justify-between items-center">
                        <span>{message.text}</span>
                        <X className="w-4 h-4 cursor-pointer text-gray-500 hover:text-gray-700" onClick={() => setMessage(null)} />
                    </div>
                </div>
            )}
            
            {/* 統計情報とソートコントロール */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md">
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base mb-2 sm:mb-0">
                全タスク: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{todos.length}</span> | 
                完了済: <span className="font-semibold text-green-600 dark:text-green-400">{completedCount}</span> | 
                未完了: <span className="font-semibold text-red-600 dark:text-red-400">{todos.length - completedCount}</span>
              </p>
              
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">ソート:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'priority' | 'deadline')}
                  className="p-1 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                  aria-label="タスクのソート基準"
                >
                  <option value="deadline">期限順</option>
                  <option value="priority">優先度順</option>
                </select>
                {sortBy === 'deadline' ? <ListEnd className="w-4 h-4 text-indigo-600" /> : <ChevronsUp className="w-4 h-4 text-indigo-600" />}
              </div>
            </div>

            {/* ToDoリスト */}
            <div className="space-y-4">
              {todos.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl shadow-md">
                  <p className="text-lg">🥳 タスクはすべて完了しました！</p>
                  <p className="text-sm mt-2">新しいタスクを登録しましょう。</p>
                </div>
              ) : (
                sortedTodos.map((todo) => {
                  const alert = getDeadlineAlert(todo);
                  
                  const alertStyle = {
                      passed: 'bg-red-50 dark:bg-red-900/50 border-red-500',
                      today: 'bg-orange-50 dark:bg-orange-900/50 border-orange-500',
                      tomorrow: 'bg-yellow-50 dark:bg-yellow-900/50 border-yellow-500',
                      soon: 'bg-indigo-50 dark:bg-indigo-900/50 border-indigo-500',
                      null: ''
                  }[alert?.type || 'null'];

                  const alertIcon = {
                    passed: <AlertTriangle className="w-4 h-4 mr-1 text-red-600" />,
                    today: <Sun className="w-4 h-4 mr-1 text-orange-600" />,
                    tomorrow: <ArrowRight className="w-4 h-4 mr-1 text-yellow-600" />,
                    soon: <Calendar className="w-4 h-4 mr-1 text-indigo-600" />,
                    null: null
                  }[alert?.type || 'null'];

                  const alertLabel = {
                    passed: '期限切れ',
                    today: '今日が期限',
                    tomorrow: '明日が期限',
                    soon: '3日以内が期限',
                    null: ''
                  }[alert?.type || 'null'];


                  return (
                    <div
                      key={todo.id}
                      className={`flex flex-col p-4 rounded-xl shadow-md transition-all duration-300 ease-in-out transform ${
                        todo.completed
                          ? 'bg-green-50/70 dark:bg-gray-700 border-l-4 border-green-400 opacity-90'
                          : `bg-white dark:bg-gray-800 border-l-4 ${alertStyle} hover:shadow-lg`
                      }`}
                    >
                      {/* 期限アラートバッジ */}
                      {alert && !todo.completed && (
                        <div className={`flex items-center text-xs font-bold px-2 py-1 mb-2 rounded-full ${
                          alert.type === 'passed' ? 'bg-red-200 text-red-800' : 
                          alert.type === 'today' ? 'bg-orange-200 text-orange-800' :
                          alert.type === 'tomorrow' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-indigo-200 text-indigo-800'
                        }`}>
                            {alertIcon}
                            <span>{alertLabel} ({alert.date})</span>
                        </div>
                      )}
                        
                      {/* ヘッダー: タスク名とアクションボタン */}
                      <div className="flex items-start justify-between">
                          <span
                            className={`flex-grow text-xl font-bold break-words cursor-pointer transition duration-150 ${
                              todo.completed
                                ? 'line-through text-gray-500 dark:text-gray-400'
                                : 'text-gray-800 dark:text-gray-200'
                            }`}
                            onClick={() => toggleTodo(todo.id)}
                          >
                            {todo.text}
                          </span>
                          
                          {/* アクションボタン群 */}
                          <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                            {/* 詳細/計画ボタン */}
                            <button
                              onClick={() => openDetailModal(todo)}
                              className="p-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-full transition duration-150"
                              aria-label="タスクの詳細と計画を編集"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            
                            {/* 完了ボタン */}
                            <button
                              onClick={() => toggleTodo(todo.id)}
                              className={`p-2 rounded-full transition duration-150 ease-in-out ${
                                todo.completed
                                  ? 'bg-green-500 hover:bg-green-600 text-white'
                                  : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                              }`}
                              aria-label={todo.completed ? '未完了に戻す' : '完了にする'}
                            >
                              <Check className="w-5 h-5" />
                            </button>

                            {/* 削除ボタン */}
                            <button
                              onClick={() => deleteTodo(todo.id)}
                              className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-full transition duration-150 ease-in-out"
                              aria-label="タスクを削除"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                      </div>

                      {/* 詳細情報表示 (期限, 優先度, 時間) */}
                      <div className="flex flex-wrap mt-2 space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          {/* 優先度 */}
                          <span className={`flex items-center px-2 py-1 rounded-full text-xs font-semibold ${priorityMap[todo.priority].color}`}>
                              <Flag className="w-3 h-3 mr-1" />
                              優先度: {priorityMap[todo.priority].label}
                          </span>

                          {/* メイン期限 */}
                          {todo.deadline && (
                              <span className={`flex items-center`}>
                                  <Calendar className="w-4 h-4 mr-1" />
                                  期限: {todo.deadline}
                              </span>
                          )}

                          {/* サブ期限 */}
                          {todo.subDeadline && (
                              <span className="flex items-center text-indigo-500">
                                  <Calendar className="w-4 h-4 mr-1" />
                                  サブ期限: {todo.subDeadline}
                              </span>
                          )}

                          {/* 所要時間 */}
                          {todo.estimatedTime > 0 && (
                              <span className="flex items-center">
                                  <Clock className="w-4 h-4 mr-1" />
                                  所要時間: {todo.estimatedTime} h
                              </span>
                          )}
                      </div>

                      {/* メモの表示 */}
                      {todo.memo && (
                          <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700 pt-2 italic">
                              メモ: {todo.memo}
                          </p>
                      )}
                      
                      {/* 計画の進捗表示 */}
                      {todo.dailyPlan.length > 0 && (
                        <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700 pt-2">
                          <div className="flex items-center text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                            <ListChecks className="w-4 h-4 mr-1" />
                            計画進捗: {todo.dailyPlan.filter(p => p.completed).length}/{todo.dailyPlan.length}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          {/* 右側: 新規タスク追加フォーム (PC: 1/3幅, スマホ: 開閉式) */}
          <div className={`sm:w-1/3 w-full order-1 sm:order-2 transition-all duration-300 ease-in-out ${
              isNewTaskFormOpen ? 'max-h-screen opacity-100' : 'max-h-0 sm:max-h-full opacity-0 sm:opacity-100 overflow-hidden'
          }`}>
            <NewTaskForm 
                newTodoText={newTodoText} setNewTodoText={setNewTodoText}
                deadlineInput={deadlineInput} setDeadlineInput={setDeadlineInput}
                subDeadlineInput={subDeadlineInput} setSubDeadlineInput={setSubDeadlineInput}
                priorityInput={priorityInput} setPriorityInput={setPriorityInput}
                estimatedTimeInput={estimatedTimeInput} setEstimatedTimeInput={setEstimatedTimeInput}
                memoInput={memoInput} setMemoInput={setMemoInput}
                addTodo={addTodo}
            />
          </div>

        </div>

        {/* 詳細編集モーダル */}
        {isDetailOpen && editingTodo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                  <h3 className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">
                    タスク詳細・計画編集
                  </h3>
                  <button onClick={closeDetailModal} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <PlanEditor todo={editingTodo} onSave={saveEditedTodo} showMessage={showMessage} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;