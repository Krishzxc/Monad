"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import MonadAuth from "./components/MonadAuth";

interface Word {
  id: number;
  text: string;
  x: number;
  y: number;
  speed: number;
  color: string;
}

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function Home() {
  const [score, setScore] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [monadAccountAddress, setMonadAccountAddress] = useState<string | null>(
    null
  );
  const [username, setUsername] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player>({
    x: 50,
    y: 80,
    width: 40,
    height: 40,
  });
  const [words, setWords] = useState<Word[]>([]);
  const [gameSpeed, setGameSpeed] = useState(1);
  const [lives, setLives] = useState(3);
  const [typedWord, setTypedWord] = useState("");
  const [currentWord, setCurrentWord] = useState<string>("");
  const [wordSpawnTimer, setWordSpawnTimer] = useState<NodeJS.Timeout | null>(
    null
  );
  const [gameLoop, setGameLoop] = useState<NodeJS.Timeout | null>(null);
  const [difficultyTimer, setDifficultyTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  const { authenticated } = usePrivy();

  const GAME_WIDTH = 800;
  const GAME_HEIGHT = 600;

  // Word lists for different difficulty levels
  const easyWords = [
    "cat",
    "dog",
    "run",
    "jump",
    "play",
    "eat",
    "sleep",
    "walk",
    "talk",
    "sing",
  ];
  const mediumWords = [
    "computer",
    "elephant",
    "beautiful",
    "adventure",
    "knowledge",
    "happiness",
    "butterfly",
    "mountain",
    "ocean",
    "sunshine",
  ];
  const hardWords = [
    "extraordinary",
    "phenomenon",
    "philosophy",
    "revolutionary",
    "sophisticated",
    "technological",
    "unprecedented",
    "accomplishment",
    "determination",
    "imagination",
  ];

  const getRandomWord = () => {
    const allWords = [...easyWords, ...mediumWords, ...hardWords];
    return allWords[(Math.random() * allWords.length) | 0];
  };

  const spawnWord = useCallback(() => {
    const wordText = getRandomWord();
    const colors = [
      "text-red-400",
      "text-blue-400",
      "text-green-400",
      "text-yellow-400",
      "text-purple-400",
      "text-pink-400",
    ];

    const newWord: Word = {
      id: Date.now() + Math.random(),
      text: wordText,
      x: Math.random() * (GAME_WIDTH - 200),
      y: -50,
      speed: gameSpeed + Math.random() * 0.5,
      color: colors[(Math.random() * colors.length) | 0],
    };

    setWords(prev => [...prev, newWord]);
  }, [gameSpeed]);

  const gameUpdate = useCallback(() => {
    setWords(prev => {
      const updated = prev
        .map(word => ({
          ...word,
          y: word.y + word.speed,
        }))
        .filter(word => word.y < GAME_HEIGHT + 50);

      // Check if words reached bottom (lose life)
      updated.forEach(word => {
        if (word.y >= GAME_HEIGHT - 50) {
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              // Game over - stop all timers
              if (gameLoop) clearInterval(gameLoop);
              if (wordSpawnTimer) clearInterval(wordSpawnTimer);
              if (difficultyTimer) clearInterval(difficultyTimer);
              setGameEnded(true);
              setGameStarted(false);
            }
            return newLives;
          });
        }
      });

      return updated;
    });

    setGameTime(prev => prev + 1);
  }, [gameLoop, wordSpawnTimer, difficultyTimer]);

  const handleTyping = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setTypedWord(value);

      // Check if typed word matches any word on screen
      setWords(prev => {
        const updated = prev.filter(word => {
          if (word.text.toLowerCase() === value.toLowerCase()) {
            // Word typed correctly - add score and remove word
            setScore(prevScore => prevScore + word.text.length * 10);
            return false; // Remove word
          }
          return true; // Keep word
        });
        return updated;
      });

      // Clear input after successful typing
      if (words.some(word => word.text.toLowerCase() === value.toLowerCase())) {
        setTypedWord("");
      }
    },
    [words]
  );

  const startGame = () => {
    // Check if user is authenticated and has username
    if (!authenticated || !monadAccountAddress || !username) {
      alert("Please connect your Monad Games ID and have a username to play!");
      return;
    }

    // Clear any existing timers first
    if (gameLoop) clearInterval(gameLoop);
    if (wordSpawnTimer) clearInterval(wordSpawnTimer);
    if (difficultyTimer) clearInterval(difficultyTimer);

    setScore(0);
    setGameEnded(false);
    setGameStarted(true);
    setGameTime(0);
    setLives(3);
    setWords([]);
    setGameSpeed(1);
    setTypedWord("");
    setCurrentWord("");

    // Start game loop
    const loop = setInterval(gameUpdate, 16);
    setGameLoop(loop);

    // Start spawning words
    const spawnLoop = setInterval(spawnWord, 2000);
    setWordSpawnTimer(spawnLoop);

    // Increase difficulty over time
    const diffLoop = setInterval(() => {
      setGameSpeed(prev => Math.min(prev + 0.3, 5));
    }, 8000);
    setDifficultyTimer(diffLoop);
  };

  const submitScore = async () => {
    if (!authenticated || !monadAccountAddress || !username) {
      alert(
        "Please connect your Monad Games ID and have a username to submit scores!"
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/submit-score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          player: monadAccountAddress,
          scoreAmount: score,
          transactionAmount: 1,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(
          `Score submitted successfully! Transaction hash: ${result.transactionHash}`
        );
      } else {
        alert(`Error submitting score: ${result.error}`);
      }
    } catch (error) {
      console.error("Error submitting score:", error);
      alert("Error submitting score. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetGame = () => {
    // Clear all timers
    if (gameLoop) clearInterval(gameLoop);
    if (wordSpawnTimer) clearInterval(wordSpawnTimer);
    if (difficultyTimer) clearInterval(difficultyTimer);

    // Reset all game state
    setScore(0);
    setGameEnded(false);
    setGameStarted(false);
    setGameTime(0);
    setLives(3);
    setWords([]);
    setGameSpeed(1);
    setTypedWord("");
    setCurrentWord("");

    // Clear timer references
    setGameLoop(null);
    setWordSpawnTimer(null);
    setDifficultyTimer(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameLoop) clearInterval(gameLoop);
      if (wordSpawnTimer) clearInterval(wordSpawnTimer);
      if (difficultyTimer) clearInterval(difficultyTimer);
    };
  }, [gameLoop, wordSpawnTimer, difficultyTimer]);

  // Check if user can play
  const canPlay = authenticated && monadAccountAddress && username;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="max-w-4xl w-full text-center space-y-8 relative z-10">
        {/* Game Title */}
        <div className="space-y-4">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
            TYPING MASTER
          </h1>
          <p className="text-xl text-cyan-300 font-light">
            Type the words before they reach the bottom! 🦈
          </p>
        </div>

        {/* Monad Games Authentication */}
        <div className="mb-8">
          <MonadAuth
            onAccountAddress={setMonadAccountAddress}
            onUsername={setUsername}
          />
        </div>

        {/* Authentication Status */}
        {!canPlay && (
          <div className="bg-gradient-to-r from-yellow-900/50 to-orange-900/50 backdrop-blur-sm border border-yellow-500/30 p-6 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">⚠</span>
              </div>
              <span className="text-yellow-400 font-semibold">
                Authentication Required
              </span>
            </div>
            <p className="text-yellow-300 mb-2">
              {!authenticated
                ? "Please connect your wallet first"
                : !monadAccountAddress
                ? "Please link your Monad Games ID account"
                : !username
                ? "Please ensure you have a username set up"
                : "Authentication in progress..."}
            </p>
            <p className="text-sm text-yellow-200">
              You need a connected Monad Games ID with a username to play and
              submit scores.
            </p>
          </div>
        )}

        {/* Game Stats Panel */}
        {canPlay && (
          <div className="bg-black/40 backdrop-blur-sm border border-cyan-500/30 p-6 rounded-2xl shadow-2xl">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400 mb-2">
                  {score}
                </div>
                <div className="text-xs text-cyan-300 uppercase tracking-wider">
                  Score
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400 mb-2">
                  {Math.floor(gameTime / 60)}:
                  {(gameTime % 60).toString().padStart(2, "0")}
                </div>
                <div className="text-xs text-purple-300 uppercase tracking-wider">
                  Time
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400 mb-2">
                  {lives}
                </div>
                <div className="text-xs text-yellow-300 uppercase tracking-wider">
                  Lives
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400 mb-2">
                  {Math.round(gameSpeed * 10) / 10}
                </div>
                <div className="text-xs text-green-300 uppercase tracking-wider">
                  Speed
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game Area */}
        {canPlay && gameStarted && !gameEnded && (
          <div className="space-y-6">
            {/* Typing Input */}
            <div className="flex justify-center">
              <input
                type="text"
                value={typedWord}
                onChange={handleTyping}
                placeholder="Start typing words..."
                className="w-96 px-6 py-4 text-xl font-mono bg-black/40 border-2 border-cyan-500/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                autoFocus
              />
            </div>

            {/* Game Container */}
            <div
              className="relative mx-auto bg-black/20 border-2 border-cyan-500/50 rounded-2xl overflow-hidden"
              style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
            >
              {/* Falling Words */}
              {words.map(word => (
                <div
                  key={word.id}
                  className={`absolute text-2xl font-bold ${word.color} drop-shadow-lg`}
                  style={{
                    left: `${word.x}px`,
                    top: `${word.y}px`,
                  }}
                >
                  {word.text}
                </div>
              ))}

              {/* Ocean floor line */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-cyan-400" />
            </div>

            {/* Instructions */}
            <div className="text-center text-sm text-cyan-300">
              <p>Type the words exactly as they appear to destroy them!</p>
              <p>
                Words fall faster as time progresses. Don&apos;t let them reach
                the bottom!
              </p>
            </div>
          </div>
        )}

        {/* Game Controls */}
        {!gameStarted && !gameEnded && (
          <div className="space-y-4">
            <button
              onClick={startGame}
              disabled={!canPlay}
              className={`w-full py-6 rounded-2xl text-2xl font-bold transform transition-all duration-200 shadow-2xl border ${
                canPlay
                  ? "bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 hover:scale-105 border-cyan-400/50"
                  : "bg-gradient-to-r from-slate-600 to-slate-700 cursor-not-allowed border-slate-500/50"
              }`}
            >
              {canPlay ? "🦈 START TYPING" : "🔒 CONNECT TO PLAY"}
            </button>
            <div className="text-sm text-cyan-300 space-y-2">
              <p>⌨️ Type words as they fall from the top</p>
              <p>🎯 Accuracy matters - type exactly as shown</p>
              <p>⚡ Speed increases over time</p>
              <p>💀 Lose lives when words reach the bottom</p>
            </div>
          </div>
        )}

        {gameEnded && (
          <div className="space-y-6">
            {/* Game Over Panel */}
            <div className="bg-gradient-to-r from-red-900/50 to-orange-900/50 backdrop-blur-sm border border-red-500/30 p-8 rounded-2xl shadow-2xl">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-red-400 mb-4">
                  💀 GAME OVER! 💀
                </h2>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">
                      {score}
                    </div>
                    <div className="text-sm text-cyan-300">Final Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      {Math.floor(gameTime / 60)}:
                      {(gameTime % 60).toString().padStart(2, "0")}
                    </div>
                    <div className="text-sm text-purple-300">Survival Time</div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-lg text-yellow-300 mb-2">
                    {score >= 1000
                      ? "🌟 Legendary Typist! 🌟"
                      : score >= 500
                      ? "⭐ Elite Shark! ⭐"
                      : score >= 200
                      ? "🚀 Skilled Hunter! 🚀"
                      : "🌊 Novice Swimmer! 🌊"}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={resetGame}
                className="flex-1 py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 rounded-xl font-semibold transform hover:scale-105 transition-all duration-200 border border-emerald-400/60 shadow-lg"
              >
                🎮 Play Again
              </button>

              {canPlay && (
                <button
                  onClick={submitScore}
                  disabled={submitting}
                  className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-blue-800 disabled:to-cyan-800 disabled:opacity-50 rounded-xl font-semibold transform hover:scale-105 transition-all duration-200 border border-blue-400/50 disabled:transform-none"
                >
                  {submitting ? "📡 Transmitting..." : "📊 Submit Score"}
                </button>
              )}
            </div>

            {!canPlay && (
              <div className="bg-yellow-900/30 border border-yellow-500/30 p-4 rounded-xl">
                <p className="text-yellow-300 text-sm">
                  🔗 Connect your Monad Games ID with a username to submit your
                  score to the leaderboard!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
