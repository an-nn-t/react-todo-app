import React, { useState } from 'react';
// アイコンを使用するためにlucide-reactからインポートします
import { Plus, Trash2, Check, X } from 'lucide-react';

// ====================================================================
// 1. 型定義 (ユーザーの types.ts に相当する内容)
// ====================================================================

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

// ====================================================================
// 2. メインコンポーネント
// ====================================================================

// Firebase用のグローバル変数はここでは無視し、ローカルステートで実装します。
// 実際のFirestore連携を行う場合は、以下の変数を活用し、
// useEffect内で初期化とデータ取得/保存ロジックを追加してください。
// const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
// const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
// const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : undefined;

const App: React.FC = () => {
  // ToDoリストのステート
  const [todos, setTodos] = useState<Todo[]>([]);
  // 新しいタスク入力のステート
  const [newTodoText, setNewTodoText] = useState('');
  
  // エラー/情報メッセージのステート
  const [message, setMessage] = useState<{ type: 'error' | 'info'; text: string } | null>(null);

  // Helper: メッセージを表示し、一定時間後に消去する関数
  const showMessage = (type: 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // ToDoを追加する関数
  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedText = newTodoText.trim();
    if (trimmedText === '') {
      showMessage('error', 'タスクの内容を入力してください。');
      return;
    }

    const newTodo: Todo = {
      id: Date.now(), // シンプルな一意なIDとしてタイムスタンプを使用
      text: trimmedText,
      completed: false,
    };

    setTodos([newTodo, ...todos]); // 新しいタスクをリストの先頭に追加
    setNewTodoText(''); // 入力フィールドをクリア
    showMessage('info', 'タスクが追加されました！');
  };

  // ToDoの完了状態を切り替える関数
  const toggleTodo = (id: number) => {
    setTodos(
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  // ToDoを削除する関数
  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
    showMessage('info', 'タスクが削除されました。');
  };

  // 完了したタスクの数
  const completedCount = todos.filter(todo => todo.completed).length;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-start justify-center p-4 sm:p-6 font-sans">
      {/* メインコンテナ */}
      <div className="w-full max-w-lg mt-10">
        <h1 className="text-4xl font-extrabold text-center text-indigo-700 dark:text-indigo-400 mb-8 tracking-wider">
          React ToDo アプリ
        </h1>

        {/* メッセージボックス */}
        {message && (
          <div 
            className={`p-3 mb-4 rounded-lg shadow-md transition-opacity duration-300 ${
              message.type === 'error' ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-green-100 text-green-800 border border-green-300'
            }`}
          >
            <div className="flex justify-between items-center">
                <span>{message.text}</span>
                <X className="w-4 h-4 cursor-pointer text-gray-500 hover:text-gray-700" onClick={() => setMessage(null)} />
            </div>
          </div>
        )}

        {/* タスク追加フォーム */}
        <form onSubmit={addTodo} className="flex space-x-2 mb-8 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl">
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            placeholder="新しいタスクを入力..."
            className="flex-grow p-3 text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-150"
            aria-label="新しいタスクの入力"
          />
          <button
            type="submit"
            className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-200 transform hover:scale-105 active:scale-95"
            aria-label="タスクを追加"
          >
            <Plus className="w-5 h-5 mr-1" />
            追加
          </button>
        </form>

        {/* 統計情報 */}
        <div className="text-center mb-6">
          <p className="text-gray-600 dark:text-gray-400">
            全タスク: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{todos.length}</span> | 
            完了済: <span className="font-semibold text-green-600 dark:text-green-400">{completedCount}</span> | 
            未完了: <span className="font-semibold text-red-600 dark:text-red-400">{todos.length - completedCount}</span>
          </p>
        </div>

        {/* ToDoリスト (ユーザーの TodoList.tsx に相当する部分) */}
        <div className="space-y-3">
          {todos.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl shadow-md">
              <p className="text-lg">🥳 タスクはすべて完了しました！</p>
              <p className="text-sm mt-2">新しいタスクを追加しましょう。</p>
            </div>
          ) : (
            todos.map((todo) => (
              <div
                key={todo.id}
                className={`flex items-center justify-between p-4 rounded-xl shadow-md transition-all duration-300 ease-in-out transform hover:scale-[1.01] ${
                  todo.completed
                    ? 'bg-green-50 dark:bg-gray-700 border-l-4 border-green-400 opacity-80'
                    : 'bg-white dark:bg-gray-800 border-l-4 border-indigo-400'
                }`}
              >
                {/* タスクの内容と完了チェック */}
                <span
                  className={`flex-grow text-lg break-words cursor-pointer select-none transition duration-150 ${
                    todo.completed
                      ? 'line-through text-gray-500 dark:text-gray-400'
                      : 'text-gray-800 dark:text-gray-200'
                  }`}
                  onClick={() => toggleTodo(todo.id)}
                >
                  {todo.text}
                </span>

                {/* アクションボタン */}
                <div className="flex items-center space-x-2 ml-4">
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
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default App;