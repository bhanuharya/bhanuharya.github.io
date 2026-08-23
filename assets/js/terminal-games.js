/**
 * Retro Terminal Games & Web Audio Synthesizer
 * Zero-dependency: Snake, Pong, Cyber Hack Cipher, and 8-bit Synth Audio.
 */
(function() {
  'use strict';

  // --- Web Audio Synthesizer for Retro Clicks, Beeps, and Degauss ---
  var audioCtx = null;
  var soundEnabled = localStorage.getItem('term-sound') === '1';

  function getAudioContext() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  var Sound = {
    isEnabled: function() {
      return soundEnabled;
    },
    setEnabled: function(val) {
      soundEnabled = !!val;
      localStorage.setItem('term-sound', soundEnabled ? '1' : '0');
    },
    click: function() {
      if (!soundEnabled) return;
      try {
        var ctx = getAudioContext();
        if (!ctx) return;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.02);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.02);
      } catch (e) {}
    },
    beep: function(freq, duration, type) {
      if (!soundEnabled) return;
      try {
        var ctx = getAudioContext();
        if (!ctx) return;
        freq = freq || 660;
        duration = duration || 0.08;
        type = type || 'square';
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch (e) {}
    },
    degauss: function() {
      if (!soundEnabled) return;
      try {
        var ctx = getAudioContext();
        if (!ctx) return;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } catch (e) {}
    },
    score: function() {
      Sound.beep(880, 0.06, 'square');
      setTimeout(function() { Sound.beep(1320, 0.1, 'square'); }, 60);
    },
    hit: function() {
      Sound.beep(220, 0.05, 'triangle');
    },
    over: function() {
      Sound.beep(300, 0.1, 'sawtooth');
      setTimeout(function() { Sound.beep(160, 0.25, 'sawtooth'); }, 100);
    }
  };

  var activeGame = null;

  function stopActiveGame() {
    if (activeGame && typeof activeGame.cleanup === 'function') {
      activeGame.cleanup();
    }
    activeGame = null;
  }

  // --- SNAKE GAME ---
  function startSnake(targetContainer, onExit) {
    stopActiveGame();
    targetContainer.innerHTML = '';

    var gameBox = document.createElement('div');
    gameBox.className = 'terminal-game-box';

    var header = document.createElement('div');
    header.className = 'game-header';
    header.innerHTML = '<span>&gt;_ RETRO SNAKE</span> <span class="game-stats">SCORE: <b id="snake-score">0</b> | HI: <b id="snake-hi">0</b></span>';
    gameBox.appendChild(header);

    var canvas = document.createElement('canvas');
    canvas.className = 'game-canvas';
    canvas.width = 400;
    canvas.height = 260;
    gameBox.appendChild(canvas);

    var controls = document.createElement('div');
    controls.className = 'game-controls-help';
    controls.innerHTML = '<span>Controls: <b>↑↓←→</b> or <b>WASD</b></span> · <span>Exit: <b>Q</b> or <b>ESC</b></span>';
    gameBox.appendChild(controls);

    var exitBtn = document.createElement('button');
    exitBtn.type = 'button';
    exitBtn.className = 'game-exit-btn';
    exitBtn.textContent = 'Exit Game [ESC]';
    gameBox.appendChild(exitBtn);

    targetContainer.appendChild(gameBox);
    gameBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    var ctx = canvas.getContext('2d');
    var gridSize = 10;
    var cols = Math.floor(canvas.width / gridSize);
    var rows = Math.floor(canvas.height / gridSize);

    var snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    var dir = { x: 1, y: 0 };
    var nextDir = { x: 1, y: 0 };
    var food = { x: 18, y: 10 };
    var score = 0;
    var highScore = parseInt(localStorage.getItem('term-snake-hi') || '0', 10);
    var isGameOver = false;
    var intervalId = null;

    var scoreEl = gameBox.querySelector('#snake-score');
    var hiEl = gameBox.querySelector('#snake-hi');
    if (hiEl) hiEl.textContent = highScore;

    function spawnFood() {
      var valid = false;
      while (!valid) {
        food.x = Math.floor(Math.random() * cols);
        food.y = Math.floor(Math.random() * rows);
        valid = !snake.some(function(seg) { return seg.x === food.x && seg.y === food.y; });
      }
    }

    function getThemeColor() {
      var theme = document.documentElement.getAttribute('data-theme') || 'default';
      if (theme === 'matrix') return '#50fa7b';
      if (theme === 'amber') return '#ffb000';
      if (theme === 'cyber') return '#00f0ff';
      if (theme === 'solaris') return '#38bdf8';
      return '#e6e6e6';
    }

    function draw() {
      var color = getThemeColor();

      // Clear
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle grid dots
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      for (var x = 0; x < canvas.width; x += gridSize * 2) {
        for (var y = 0; y < canvas.height; y += gridSize * 2) {
          ctx.fillRect(x, y, 1, 1);
        }
      }

      // Draw Food
      ctx.fillStyle = (document.documentElement.getAttribute('data-theme') === 'amber') ? '#ff4444' : '#ff5555';
      ctx.fillRect(food.x * gridSize + 1, food.y * gridSize + 1, gridSize - 2, gridSize - 2);

      // Draw Snake
      ctx.fillStyle = color;
      snake.forEach(function(seg, i) {
        if (i === 0) {
          // Head
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(seg.x * gridSize, seg.y * gridSize, gridSize - 1, gridSize - 1);
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(seg.x * gridSize + 1, seg.y * gridSize + 1, gridSize - 2, gridSize - 2);
        }
      });

      // Game Over Overlay
      if (isGameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ff5555';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.fillText('Press SPACE to Restart or ESC to Exit', canvas.width / 2, canvas.height / 2 + 15);
      }
    }

    function step() {
      if (isGameOver) return;

      dir = nextDir;
      var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

      // Wall collision
      if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
        gameOver();
        return;
      }

      // Self collision
      if (snake.some(function(seg) { return seg.x === head.x && seg.y === head.y; })) {
        gameOver();
        return;
      }

      snake.unshift(head);

      // Food check
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        if (scoreEl) scoreEl.textContent = score;
        if (score > highScore) {
          highScore = score;
          localStorage.setItem('term-snake-hi', highScore);
          if (hiEl) hiEl.textContent = highScore;
        }
        Sound.score();
        spawnFood();
      } else {
        snake.pop();
      }

      draw();
    }

    function gameOver() {
      isGameOver = true;
      clearInterval(intervalId);
      Sound.over();
      draw();
    }

    function restart() {
      snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
      ];
      dir = { x: 1, y: 0 };
      nextDir = { x: 1, y: 0 };
      score = 0;
      if (scoreEl) scoreEl.textContent = '0';
      isGameOver = false;
      spawnFood();
      clearInterval(intervalId);
      intervalId = setInterval(step, 85);
      draw();
    }

    function handleKey(e) {
      if (e.key === 'Escape' || e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        exit();
        return;
      }
      if (isGameOver && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        restart();
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        if (dir.y !== 1) nextDir = { x: 0, y: -1 };
        e.preventDefault();
        Sound.click();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        if (dir.y !== -1) nextDir = { x: 0, y: 1 };
        e.preventDefault();
        Sound.click();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (dir.x !== 1) nextDir = { x: -1, y: 0 };
        e.preventDefault();
        Sound.click();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (dir.x !== -1) nextDir = { x: 1, y: 0 };
        e.preventDefault();
        Sound.click();
      }
    }

    function exit() {
      clearInterval(intervalId);
      document.removeEventListener('keydown', handleKey);
      gameBox.remove();
      if (typeof onExit === 'function') onExit(score);
    }

    exitBtn.addEventListener('click', exit);
    document.addEventListener('keydown', handleKey);

    spawnFood();
    draw();
    intervalId = setInterval(step, 85);

    activeGame = {
      name: 'snake',
      cleanup: function() {
        clearInterval(intervalId);
        document.removeEventListener('keydown', handleKey);
      }
    };
  }

  // --- PONG GAME ---
  function startPong(targetContainer, onExit) {
    stopActiveGame();
    targetContainer.innerHTML = '';

    var gameBox = document.createElement('div');
    gameBox.className = 'terminal-game-box';

    var header = document.createElement('div');
    header.className = 'game-header';
    header.innerHTML = '<span>&gt;_ RETRO PONG</span> <span class="game-stats">YOU: <b id="pong-p1">0</b> | CPU: <b id="pong-cpu">0</b></span>';
    gameBox.appendChild(header);

    var canvas = document.createElement('canvas');
    canvas.className = 'game-canvas';
    canvas.width = 420;
    canvas.height = 240;
    gameBox.appendChild(canvas);

    var controls = document.createElement('div');
    controls.className = 'game-controls-help';
    controls.innerHTML = '<span>Paddle: <b>↑ / ↓</b> or <b>W / S</b></span> · <span>Exit: <b>Q</b> or <b>ESC</b></span>';
    gameBox.appendChild(controls);

    var exitBtn = document.createElement('button');
    exitBtn.type = 'button';
    exitBtn.className = 'game-exit-btn';
    exitBtn.textContent = 'Exit Game [ESC]';
    gameBox.appendChild(exitBtn);

    targetContainer.appendChild(gameBox);
    gameBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    var ctx = canvas.getContext('2d');
    var p1Score = 0;
    var cpuScore = 0;
    var paddleW = 8;
    var paddleH = 46;
    var p1Y = (canvas.height - paddleH) / 2;
    var cpuY = (canvas.height - paddleH) / 2;
    var ballX = canvas.width / 2;
    var ballY = canvas.height / 2;
    var ballSpeedX = 3.5;
    var ballSpeedY = 2.0;
    var ballSize = 6;
    var keyState = { up: false, down: false };
    var animId = null;

    var p1ScoreEl = gameBox.querySelector('#pong-p1');
    var cpuScoreEl = gameBox.querySelector('#pong-cpu');

    function resetBall(servingTo) {
      ballX = canvas.width / 2;
      ballY = canvas.height / 2;
      ballSpeedX = (servingTo === 'p1' ? -3.5 : 3.5);
      ballSpeedY = (Math.random() * 3) - 1.5;
    }

    function getThemeColor() {
      var theme = document.documentElement.getAttribute('data-theme') || 'default';
      if (theme === 'matrix') return '#50fa7b';
      if (theme === 'amber') return '#ffb000';
      if (theme === 'cyber') return '#00f0ff';
      if (theme === 'solaris') return '#38bdf8';
      return '#ffffff';
    }

    function loop() {
      // Move Player Paddle
      if (keyState.up && p1Y > 0) p1Y -= 4;
      if (keyState.down && p1Y < canvas.height - paddleH) p1Y += 4;

      // Move AI Paddle (with deliberate slight lag for fun)
      var cpuCenter = cpuY + paddleH / 2;
      if (cpuCenter < ballY - 10 && cpuY < canvas.height - paddleH) cpuY += 2.8;
      else if (cpuCenter > ballY + 10 && cpuY > 0) cpuY -= 2.8;

      // Move Ball
      ballX += ballSpeedX;
      ballY += ballSpeedY;

      // Top / Bottom wall bounce
      if (ballY <= 0 || ballY >= canvas.height - ballSize) {
        ballSpeedY = -ballSpeedY;
        Sound.hit();
      }

      // Player Paddle Hit
      if (ballX <= 18 + paddleW && ballX >= 18) {
        if (ballY + ballSize >= p1Y && ballY <= p1Y + paddleH) {
          ballSpeedX = Math.abs(ballSpeedX) * 1.05;
          var deltaY = ballY - (p1Y + paddleH / 2);
          ballSpeedY = deltaY * 0.22;
          Sound.hit();
        }
      }

      // CPU Paddle Hit
      if (ballX + ballSize >= canvas.width - 18 - paddleW && ballX <= canvas.width - 18) {
        if (ballY + ballSize >= cpuY && ballY <= cpuY + paddleH) {
          ballSpeedX = -Math.abs(ballSpeedX) * 1.05;
          var deltaY = ballY - (cpuY + paddleH / 2);
          ballSpeedY = deltaY * 0.22;
          Sound.hit();
        }
      }

      // Miss / Score
      if (ballX < 0) {
        cpuScore++;
        if (cpuScoreEl) cpuScoreEl.textContent = cpuScore;
        Sound.over();
        resetBall('p1');
      } else if (ballX > canvas.width) {
        p1Score++;
        if (p1ScoreEl) p1ScoreEl.textContent = p1Score;
        Sound.score();
        resetBall('cpu');
      }

      // Render
      var color = getThemeColor();
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Center dotted line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Paddles
      ctx.fillStyle = color;
      ctx.fillRect(18, p1Y, paddleW, paddleH);
      ctx.fillRect(canvas.width - 18 - paddleW, cpuY, paddleW, paddleH);

      // Ball
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ballX, ballY, ballSize, ballSize);

      animId = requestAnimationFrame(loop);
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape' || e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        exit();
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        keyState.up = true;
        e.preventDefault();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        keyState.down = true;
        e.preventDefault();
      }
    }

    function handleKeyUp(e) {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        keyState.up = false;
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        keyState.down = false;
      }
    }

    function exit() {
      if (animId) cancelAnimationFrame(animId);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      gameBox.remove();
      if (typeof onExit === 'function') onExit(p1Score);
    }

    exitBtn.addEventListener('click', exit);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    animId = requestAnimationFrame(loop);

    activeGame = {
      name: 'pong',
      cleanup: function() {
        if (animId) cancelAnimationFrame(animId);
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
      }
    };
  }

  // --- CYBER HACK / WARGAME CIPHER ---
  function startHack(targetContainer, onExit) {
    stopActiveGame();
    targetContainer.innerHTML = '';

    var gameBox = document.createElement('div');
    gameBox.className = 'terminal-game-box cyber-hack-box';

    var wordsPool = [
      'NETWORK', 'FIREWALL', 'PROTOCOL', 'OVERRIDE', 'ENCRYPT',
      'SECURITY', 'TERMINAL', 'DATABASE', 'KEYSPACE', 'HARDWARE',
      'FIRMWARE', 'PASSWORD', 'MAINFRAME', 'AIRGAPED', 'SANDBOX'
    ];

    // Pick 8 random words
    var shuffled = wordsPool.slice().sort(function() { return 0.5 - Math.random(); });
    var gameWords = shuffled.slice(0, 8);
    var secret = gameWords[Math.floor(Math.random() * gameWords.length)];
    var attemptsLeft = 4;

    var header = document.createElement('div');
    header.className = 'game-header';
    header.innerHTML = '<span>&gt;_ MEMORY OVERRIDE PROTOCOL</span> <span class="game-stats">ATTEMPTS: <b id="hack-attempts">4</b></span>';
    gameBox.appendChild(header);

    var logView = document.createElement('div');
    logView.className = 'hack-log-view';
    logView.innerHTML = '<p class="dim">&gt; ENTER CIPHER KEY OR CLICK A MEMORY BLOCK TO TEST LIKENESS:</p>';
    gameBox.appendChild(logView);

    var memGrid = document.createElement('div');
    memGrid.className = 'hack-mem-grid';

    var baseHex = 0xF400 + Math.floor(Math.random() * 0x0500);

    gameWords.forEach(function(w, idx) {
      var addr = '0x' + (baseHex + idx * 16).toString(16).toUpperCase();
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hack-word-btn';
      btn.innerHTML = `<span class="dim">${addr}</span> [<b>${w}</b>]`;
      btn.addEventListener('click', function() { testGuess(w, btn); });
      memGrid.appendChild(btn);
    });

    gameBox.appendChild(memGrid);

    var exitBtn = document.createElement('button');
    exitBtn.type = 'button';
    exitBtn.className = 'game-exit-btn';
    exitBtn.textContent = 'Exit Hack [ESC]';
    gameBox.appendChild(exitBtn);

    targetContainer.appendChild(gameBox);
    gameBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    function getLikeness(guess, target) {
      var score = 0;
      var len = Math.min(guess.length, target.length);
      for (var i = 0; i < len; i++) {
        if (guess[i] === target[i]) score++;
      }
      return score;
    }

    function testGuess(word, btnEl) {
      if (attemptsLeft <= 0) return;

      var match = (word === secret);
      var likeness = getLikeness(word, secret);

      var p = document.createElement('p');
      p.className = 'hack-log-line';

      if (match) {
        p.innerHTML = `<span style="color:#50fa7b">&gt; [OK] PASSWORD ACCEPTED! ACCESS GRANTED.</span>`;
        logView.appendChild(p);
        Sound.score();
        attemptsLeft = 0;
        if (btnEl) btnEl.classList.add('hack-word-win');
      } else {
        attemptsLeft--;
        var attEl = gameBox.querySelector('#hack-attempts');
        if (attEl) attEl.textContent = attemptsLeft;

        p.innerHTML = `<span style="color:#ff5555">&gt; [DENIED] "${word}" - Likeness = ${likeness}/${secret.length}</span>`;
        logView.appendChild(p);
        Sound.hit();
        if (btnEl) btnEl.disabled = true;

        if (attemptsLeft <= 0) {
          var overP = document.createElement('p');
          overP.innerHTML = `<span style="color:#ff5555">&gt; [LOCKOUT] SYSTEM TERMINATED. Correct key was: ${secret}</span>`;
          logView.appendChild(overP);
          Sound.over();
        }
      }
      logView.scrollTop = logView.scrollHeight;
    }

    function handleKey(e) {
      if (e.key === 'Escape' || e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        exit();
      }
    }

    function exit() {
      document.removeEventListener('keydown', handleKey);
      gameBox.remove();
      if (typeof onExit === 'function') onExit();
    }

    exitBtn.addEventListener('click', exit);
    document.addEventListener('keydown', handleKey);

    activeGame = {
      name: 'hack',
      cleanup: function() {
        document.removeEventListener('keydown', handleKey);
      }
    };
  }

  window.TerminalGames = {
    startSnake: startSnake,
    startPong: startPong,
    startHack: startHack,
    stopActiveGame: stopActiveGame,
    Sound: Sound
  };
})();
