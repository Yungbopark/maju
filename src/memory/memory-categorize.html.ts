export const memoryCategorizeHtml = String.raw`<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Maju Memory Categorize Debug</title>
    <style>
      :root {
        --bg: #f5f6f8;
        --panel: #ffffff;
        --border: #d9dee8;
        --text: #202636;
        --muted: #667085;
        --accent: #155e75;
        --accent-strong: #0e4758;
        --chip: #e7f4f7;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
          "Segoe UI", sans-serif;
      }

      main {
        display: grid;
        gap: 18px;
        margin: 0 auto;
        max-width: 1120px;
        padding: 28px;
      }

      header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: end;
      }

      h1,
      h2,
      p {
        margin: 0;
      }

      h1 {
        font-size: 22px;
        letter-spacing: 0;
      }

      .muted {
        color: var(--muted);
        font-size: 13px;
      }

      .layout {
        display: grid;
        grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
        gap: 18px;
      }

      .panel {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 16px;
      }

      textarea {
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text);
        font: inherit;
        min-height: 180px;
        outline: none;
        padding: 12px;
        resize: vertical;
        width: 100%;
      }

      button {
        border: 1px solid transparent;
        border-radius: 8px;
        background: var(--accent);
        color: white;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
        min-height: 40px;
        padding: 0 14px;
      }

      button:hover {
        background: var(--accent-strong);
      }

      button.secondary {
        background: white;
        border-color: var(--border);
        color: var(--text);
      }

      .samples {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }

      .actions {
        display: flex;
        align-items: center;
        gap: 10px;
        justify-content: space-between;
        margin-top: 12px;
      }

      .category {
        color: var(--accent);
        font-size: 42px;
        font-weight: 800;
        line-height: 1.1;
        margin-top: 8px;
        word-break: break-word;
      }

      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }

      .chip {
        background: var(--chip);
        border: 1px solid #b9e0e8;
        border-radius: 999px;
        color: var(--accent-strong);
        font-size: 13px;
        font-weight: 700;
        padding: 6px 10px;
      }

      .grid {
        display: grid;
        gap: 12px;
        margin-top: 14px;
      }

      .field {
        border-top: 1px solid var(--border);
        padding-top: 12px;
      }

      .label {
        color: var(--muted);
        font-size: 12px;
        font-weight: 800;
        margin-bottom: 5px;
        text-transform: uppercase;
      }

      pre {
        background: #111827;
        border-radius: 8px;
        color: #e5e7eb;
        margin: 0;
        max-height: 420px;
        overflow: auto;
        padding: 12px;
        white-space: pre-wrap;
        word-break: break-word;
      }

      @media (max-width: 860px) {
        .layout {
          grid-template-columns: 1fr;
        }

        header {
          align-items: start;
          flex-direction: column;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <h1>Memory Category Debug</h1>
          <p class="muted">자유 답변을 LLM이 한 단어 카테고리로 추론하는지 확인합니다.</p>
        </div>
        <div id="status" class="muted">Ready</div>
      </header>

      <section class="layout">
        <div class="panel">
          <textarea id="textInput" placeholder="예: 요즘은 건강이 제일 중요해요."></textarea>
          <div class="actions">
            <button id="categorizeButton" type="button">Categorize</button>
          </div>
          <div class="samples" id="samples"></div>
        </div>

        <div class="panel">
          <div class="label">Memory Category</div>
          <div id="category" class="category">-</div>
          <div id="candidates" class="chips"></div>

          <div class="grid">
            <div class="field">
              <div class="label">Surface Concept</div>
              <div id="surfaceConcept">-</div>
            </div>
            <div class="field">
              <div class="label">Reason</div>
              <div id="reason">-</div>
            </div>
            <div class="field">
              <div class="label">Memory Longevity</div>
              <div id="memoryLongevity">-</div>
            </div>
            <div class="field">
              <div class="label">Save Score</div>
              <div id="saveScore">-</div>
            </div>
            <div class="field">
              <div class="label">Save Reason</div>
              <div id="saveReason">-</div>
            </div>
            <div class="field">
              <div class="label">Abstraction Reason</div>
              <div id="abstractionReason">-</div>
            </div>
            <div class="field">
              <div class="label">Should Save</div>
              <div id="shouldSave">-</div>
            </div>
            <div class="field">
              <div class="label">Memory Type</div>
              <div id="memoryType">-</div>
            </div>
            <div class="field">
              <div class="label">Confidence</div>
              <div id="confidence">-</div>
            </div>
            <div class="field">
              <div class="label">Result JSON</div>
              <pre id="resultJson">{}</pre>
            </div>
          </div>
        </div>
      </section>
    </main>

    <script>
      const samples = [
        '요즘은 건강이 제일 중요해요.',
        '부모님이 편찮으셔서 걱정이 많아요.',
        '취업 준비 때문에 스트레스를 많이 받고 있어요.',
        '돈보다 자유로운 시간이 더 중요하다고 생각해요.',
        '새로운 걸 배우는 게 제일 재밌어요.',
      ];

      const textInput = document.querySelector('#textInput');
      const categorizeButton = document.querySelector('#categorizeButton');
      const status = document.querySelector('#status');
      const sampleRoot = document.querySelector('#samples');

      const fields = {
        category: document.querySelector('#category'),
        surfaceConcept: document.querySelector('#surfaceConcept'),
        candidates: document.querySelector('#candidates'),
        reason: document.querySelector('#reason'),
        memoryLongevity: document.querySelector('#memoryLongevity'),
        saveScore: document.querySelector('#saveScore'),
        saveReason: document.querySelector('#saveReason'),
        abstractionReason: document.querySelector('#abstractionReason'),
        shouldSave: document.querySelector('#shouldSave'),
        memoryType: document.querySelector('#memoryType'),
        confidence: document.querySelector('#confidence'),
        resultJson: document.querySelector('#resultJson'),
      };

      samples.forEach((sample) => {
        const button = document.createElement('button');
        button.className = 'secondary';
        button.type = 'button';
        button.textContent = sample;
        button.addEventListener('click', () => {
          textInput.value = sample;
          runCategorize();
        });
        sampleRoot.appendChild(button);
      });

      function setLoading(isLoading) {
        categorizeButton.disabled = isLoading;
        status.textContent = isLoading ? 'Analyzing...' : 'Ready';
      }

      function renderResult(result) {
        fields.category.textContent = result.category ?? 'Unknown';
        fields.surfaceConcept.textContent = result.surfaceConcept ?? 'Unknown';
        fields.candidates.replaceChildren(
          ...(result.candidates ?? []).map((candidate) => {
            const chip = document.createElement('span');
            chip.className = 'chip';
            chip.textContent = candidate;
            return chip;
          }),
        );
        fields.reason.textContent = result.reason ?? '-';
        fields.memoryLongevity.textContent = result.memoryLongevity ?? '-';
        fields.saveScore.textContent =
          typeof result.saveScore === 'number'
            ? String(result.saveScore)
            : String(result.saveScore ?? '-');
        fields.saveReason.textContent = result.saveReason ?? '-';
        fields.abstractionReason.textContent = result.abstractionReason ?? '-';
        fields.shouldSave.textContent = String(result.shouldSave ?? false);
        fields.memoryType.textContent = result.memoryType ?? 'Unknown';
        fields.confidence.textContent =
          typeof result.confidence === 'number'
            ? result.confidence.toFixed(2)
            : String(result.confidence ?? '-');
        fields.resultJson.textContent = JSON.stringify(result, null, 2);
      }

      async function runCategorize() {
        const text = textInput.value.trim();

        if (!text) {
          return;
        }

        setLoading(true);

        try {
          const response = await fetch('/api/memory/categorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
          });
          const result = await response.json();
          renderResult(result);
        } finally {
          setLoading(false);
        }
      }

      categorizeButton.addEventListener('click', runCategorize);

      textInput.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' || event.shiftKey) {
          return;
        }

        event.preventDefault();

        if (categorizeButton.disabled) {
          return;
        }

        runCategorize();
      });
    </script>
  </body>
</html>`;
