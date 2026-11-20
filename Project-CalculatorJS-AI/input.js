const resultDisplay = document.querySelector("#result");
    const expressionDisplay = document.querySelector("#expression");
    const keypad = document.querySelector("#keypad");
    const historyList = document.querySelector("#history-list");
    const status = document.querySelector("#status");
    const numberFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 10 });
    const scientificNumberFormatter = new Intl.NumberFormat("id-ID", { maximumSignificantDigits: 12 });

    let currentInput = "0";
    let storedValue = null;
    let pendingOperator = null;
    let waitingForOperand = false;
    let expressionText = "";
    let calculations = [];

    const operatorSymbols = { "+": "+", "-": "−", "*": "×", "/": "÷" };

    function formatNumber(value) {
      if (value === "Error") return value;
      if (/[eE]/.test(value)) return scientificNumberFormatter.format(Number(value));
      const [integer, fraction] = value.split(".");
      const formattedInteger = numberFormatter.format(Number(integer));
      return fraction === undefined ? formattedInteger : `${formattedInteger},${fraction}`;
    }

    function render() {
      resultDisplay.textContent = formatNumber(currentInput);
      expressionDisplay.textContent = expressionText;
      keypad.querySelectorAll("[data-operator]").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.operator === pendingOperator && waitingForOperand));
      });
    }

    function normalizeResult(value) {
      if (!Number.isFinite(value)) return null;
      const rounded = Number(value.toPrecision(12));
      return Object.is(rounded, -0) ? "0" : String(rounded);
    }

    function calculate(left, right, operator) {
      switch (operator) {
        case "+": return left + right;
        case "-": return left - right;
        case "*": return left * right;
        case "/": return right === 0 ? null : left / right;
        default: return null;
      }
    }

    function enterDigit(digit) {
      if (currentInput === "Error" || waitingForOperand) {
        currentInput = digit;
        waitingForOperand = false;
      } else if (currentInput.replace("-", "").replace(".", "").length < 14) {
        currentInput = currentInput === "0" ? digit : currentInput + digit;
      }
      render();
    }

    function enterDecimal() {
      if (currentInput === "Error" || waitingForOperand) {
        currentInput = "0.";
        waitingForOperand = false;
      } else if (!currentInput.includes(".")) {
        currentInput += ".";
      }
      render();
    }

    function chooseOperator(operator) {
      if (currentInput === "Error") clearCalculator();
      const inputValue = Number(currentInput);

      if (pendingOperator && !waitingForOperand) {
        const result = normalizeResult(calculate(storedValue, inputValue, pendingOperator));
        if (result === null) {
          showError();
          return;
        }
        currentInput = result;
        storedValue = Number(result);
      } else {
        storedValue = inputValue;
      }

      pendingOperator = operator;
      waitingForOperand = true;
      expressionText = `${formatNumber(String(storedValue))} ${operatorSymbols[operator]}`;
      render();
    }

    function addToHistory(expression, answer) {
      calculations.unshift({ expression, answer });
      calculations = calculations.slice(0, 12);
      historyList.replaceChildren();

      calculations.forEach(({ expression: equation, answer: value }) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "history-item";
        item.setAttribute("aria-label", `Gunakan hasil ${formatNumber(value)}`);

        const equationLabel = document.createElement("span");
        equationLabel.className = "history-equation";
        equationLabel.textContent = equation;
        const answerLabel = document.createElement("span");
        answerLabel.className = "history-answer";
        answerLabel.textContent = formatNumber(value);
        item.append(equationLabel, answerLabel);
        item.addEventListener("click", () => {
          currentInput = value;
          storedValue = null;
          pendingOperator = null;
          waitingForOperand = false;
          expressionText = equation;
          render();
        });
        historyList.append(item);
      });
    }

    function showError() {
      currentInput = "Error";
      storedValue = null;
      pendingOperator = null;
      waitingForOperand = true;
      expressionText = "Tidak bisa membagi dengan nol";
      status.textContent = "Kesalahan: tidak bisa membagi dengan nol.";
      render();
    }

    function equals() {
      if (!pendingOperator || storedValue === null || currentInput === "Error") return;
      const operator = pendingOperator;
      const left = storedValue;
      const right = Number(currentInput);
      const answer = normalizeResult(calculate(left, right, operator));

      if (answer === null) {
        showError();
        return;
      }

      const equation = `${formatNumber(String(left))} ${operatorSymbols[operator]} ${formatNumber(currentInput)} =`;
      addToHistory(equation, answer);
      currentInput = answer;
      storedValue = null;
      pendingOperator = null;
      waitingForOperand = true;
      expressionText = equation;
      render();
    }

    function clearCalculator() {
      currentInput = "0";
      storedValue = null;
      pendingOperator = null;
      waitingForOperand = false;
      expressionText = "";
      status.textContent = "";
      render();
    }

    function applyAction(action) {
      switch (action) {
        case "clear":
          clearCalculator();
          break;
        case "equals":
          equals();
          break;
        case "decimal":
          enterDecimal();
          break;
        case "backspace":
          if (!waitingForOperand && currentInput !== "Error") {
            currentInput = currentInput.length > 1 ? currentInput.slice(0, -1) : "0";
            if (currentInput === "-") currentInput = "0";
            render();
          }
          break;
        case "sign":
          if (currentInput !== "Error" && Number(currentInput) !== 0) {
            currentInput = currentInput.startsWith("-") ? currentInput.slice(1) : `-${currentInput}`;
            render();
          }
          break;
        case "percent":
          if (currentInput !== "Error") {
            const percentage = normalizeResult(Number(currentInput) / 100);
            if (percentage !== null) {
              currentInput = percentage;
              render();
            }
          }
          break;
      }
    }

    keypad.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.digit !== undefined) enterDigit(button.dataset.digit);
      else if (button.dataset.operator) chooseOperator(button.dataset.operator);
      else if (button.dataset.action) applyAction(button.dataset.action);
    });

    document.addEventListener("keydown", (event) => {
      if (/^[0-9]$/.test(event.key)) enterDigit(event.key);
      else if (event.key === "." || event.key === ",") enterDecimal();
      else if (["+", "-", "*", "/"].includes(event.key)) chooseOperator(event.key);
      else if (event.key === "Enter" || event.key === "=") {
        event.preventDefault();
        equals();
      } else if (event.key === "Backspace") {
        event.preventDefault();
        applyAction("backspace");
      }
      else if (event.key === "Escape") clearCalculator();
      else if (event.key === "%") applyAction("percent");
    });

    document.querySelector("#clear-history").addEventListener("click", () => {
      calculations = [];
      historyList.innerHTML = '<div class="history-empty"><span aria-hidden="true">◷</span><span>Hasil hitunganmu akan muncul di sini</span></div>';
    });

    document.querySelector("#theme-toggle").addEventListener("click", () => {
      const isLight = document.documentElement.dataset.theme !== "light";
      document.documentElement.dataset.theme = isLight ? "light" : "dark";
      document.querySelector("#theme-icon").innerHTML = isLight
        ? '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path>'
        : '<path d="M20.2 15.2A8.5 8.5 0 0 1 8.8 3.8 8.5 8.5 0 1 0 20.2 15.2Z"></path>';
    });

    render();
