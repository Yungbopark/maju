export const developmentPlaygroundHtml = String.raw`<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Maju Conversation Playground</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f6f7f9;
        --panel: #ffffff;
        --border: #d8dde6;
        --text: #1d2433;
        --muted: #667085;
        --accent: #146b5f;
        --accent-strong: #0e5048;
        --user: #1f6feb;
        --assistant: #eef2f6;
        --danger: #b42318;
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

      .shell {
        display: grid;
        grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.55fr) minmax(360px, 0.9fr);
        height: 100vh;
        overflow: hidden;
      }

      .chat,
      .session,
      .debug {
        height: 100vh;
        min-width: 0;
        padding: 24px;
      }

      .chat {
        display: grid;
        grid-template-rows: auto 1fr auto;
        gap: 16px;
        border-right: 1px solid var(--border);
      }

      .session {
        display: grid;
        grid-template-rows: auto 1fr;
        gap: 16px;
        background: #fbfcfd;
        border-right: 1px solid var(--border);
        min-height: 0;
        overflow: hidden;
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      h1,
      h2 {
        margin: 0;
        letter-spacing: 0;
      }

      h1 {
        font-size: 20px;
        line-height: 1.2;
      }

      h2 {
        font-size: 15px;
      }

      .subtitle,
      .meta {
        color: var(--muted);
        font-size: 13px;
      }

      button {
        border: 1px solid transparent;
        border-radius: 8px;
        background: var(--accent);
        color: white;
        cursor: pointer;
        font: inherit;
        font-weight: 600;
        min-height: 40px;
        padding: 0 14px;
      }

      button:hover {
        background: var(--accent-strong);
      }

      button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: flex-end;
      }

      button.secondary {
        background: white;
        border-color: var(--border);
        color: var(--text);
      }

      button.secondary:hover {
        background: #f1f4f8;
      }

      .messages {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-height: 0;
        overflow: auto;
        padding: 4px 4px 12px;
      }

      .message {
        display: grid;
        gap: 5px;
        max-width: min(720px, 92%);
      }

      .message.user {
        align-self: flex-end;
      }

      .bubble {
        border-radius: 8px;
        line-height: 1.55;
        padding: 11px 13px;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .user .bubble {
        background: var(--user);
        color: white;
      }

      .assistant .bubble {
        background: var(--assistant);
        border: 1px solid var(--border);
      }

      .message .meta {
        font-size: 12px;
      }

      .user .meta {
        text-align: right;
      }

      .composer {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        align-items: end;
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 10px;
      }

      textarea {
        border: 0;
        color: var(--text);
        font: inherit;
        min-height: 48px;
        outline: none;
        resize: vertical;
      }

      .debug {
        display: grid;
        grid-template-rows: auto auto 1fr;
        gap: 16px;
        background: var(--panel);
        min-height: 0;
        overflow: hidden;
      }

      .timeline {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }

      .state {
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
        min-height: 34px;
        padding: 9px 8px;
        text-align: center;
      }

      .state.active {
        background: #dff4ee;
        border-color: var(--accent);
        color: var(--accent-strong);
      }

      .debug-grid,
      .session-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
        min-height: 0;
        overflow: auto;
        padding-right: 4px;
      }

      .field {
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 10px;
      }

      .label {
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 6px;
        text-transform: uppercase;
      }

      pre {
        margin: 0;
        overflow: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .error {
        color: var(--danger);
      }

      @media (max-width: 920px) {
        .shell {
          grid-template-columns: 1fr;
        }

        .chat {
          border-right: 0;
          height: 65vh;
        }

        .debug {
          border-top: 1px solid var(--border);
          height: 35vh;
        }

        .session {
          border-right: 0;
          border-top: 1px solid var(--border);
          height: 40vh;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="chat" data-selection-region="chat" tabindex="-1">
        <div class="header">
          <div>
            <h1>Maju Conversation Playground</h1>
            <div class="subtitle">Development harness using OpenAI Function Calling</div>
          </div>
          <div class="actions">
            <button id="startButton" type="button">대화 시작</button>
            <button id="focusButton" class="secondary" type="button">Focus 실험</button>
            <button id="endButton" class="secondary" type="button">종료</button>
          </div>
        </div>

        <div id="messages" class="messages" aria-live="polite"></div>

        <form id="composer" class="composer">
          <textarea
            id="messageInput"
            placeholder="메시지를 입력하세요"
            rows="2"
          ></textarea>
          <button id="sendButton" type="submit">전송</button>
        </form>
      </section>

      <aside class="session" data-selection-region="session" tabindex="-1">
        <div>
          <h2>Session</h2>
          <div id="sessionStatus" class="subtitle">No active session</div>
        </div>

        <div id="sessionContent" class="session-grid">
          <div class="field">
            <div class="label">SessionId</div>
            <pre id="sessionId">-</pre>
          </div>
          <div class="field">
            <div class="label">OpeningScenario Id</div>
            <pre id="openingScenario">-</pre>
          </div>
          <div class="field">
            <div class="label">OpeningScenario Category</div>
            <pre id="openingScenarioCategory">-</pre>
          </div>
          <div class="field">
            <div class="label">Assistant Opening</div>
            <pre id="assistantOpening">-</pre>
          </div>
          <div class="field">
            <div class="label">Current Turn</div>
            <pre id="currentTurn">0</pre>
          </div>
          <div class="field">
            <div class="label">Started At</div>
            <pre id="startedAt">-</pre>
          </div>
          <div class="field">
            <div class="label">Turn Count</div>
            <pre id="turnCount">0</pre>
          </div>
          <div class="field">
            <div class="label">Conversation State</div>
            <pre id="sessionConversationState">-</pre>
          </div>
          <div class="field">
            <div class="label">Conversation Summary</div>
            <pre id="conversationSummary">{}</pre>
          </div>
          <div class="field">
            <div class="label">Last Report Path</div>
            <pre id="lastReportPath">-</pre>
          </div>
        </div>
      </aside>

      <aside class="debug" data-selection-region="debug" tabindex="-1">
        <div>
          <h2>Debug Panel</h2>
          <div id="status" class="subtitle">Ready</div>
        </div>

        <div class="timeline">
          <div class="state" data-state="OPENING">OPENING</div>
          <div class="state" data-state="FOLLOW_UP">FOLLOW_UP</div>
          <div class="state" data-state="CARE_SUGGESTION">CARE_SUGGESTION</div>
        </div>

        <div id="debugContent" class="debug-grid">
          <div class="field">
            <div class="label">Selected Tool</div>
            <pre id="selectedTool">-</pre>
          </div>
          <div class="field">
            <div class="label">Tool Arguments</div>
            <pre id="toolArguments">{}</pre>
          </div>
          <div class="field">
            <div class="label">Tool Result</div>
            <pre id="toolResult">{}</pre>
          </div>
          <div class="field">
            <div class="label">Final Assistant Response</div>
            <pre id="assistantResponse">-</pre>
          </div>
          <div class="field">
            <div class="label">Conversation State</div>
            <pre id="conversationState">-</pre>
          </div>
          <div class="field">
            <div class="label">Conversation Intent</div>
            <pre id="conversationIntent">-</pre>
          </div>
          <div class="field">
            <div class="label">Conversation Analysis</div>
            <pre id="conversationAnalysis">{}</pre>
          </div>
          <div class="field">
            <div class="label">Current Focus</div>
            <pre id="currentFocus">{}</pre>
          </div>
          <div class="field">
            <div class="label">Remaining User Turns</div>
            <pre id="remainingUserTurns">-</pre>
          </div>
          <div class="field">
            <div class="label">Generated System Prompt</div>
            <pre id="generatedSystemPrompt">-</pre>
          </div>
          <div class="field">
            <div class="label">OpenAI Response</div>
            <pre id="openAIResponse">{}</pre>
          </div>
          <div class="field">
            <div class="label">Focus Evaluation</div>
            <pre id="focusEvaluation">{}</pre>
          </div>
          <div class="field">
            <div class="label">Next Action</div>
            <pre id="nextAction">-</pre>
          </div>
          <div class="field">
            <div class="label">Raw Trace JSON</div>
            <pre id="rawTrace">{}</pre>
          </div>
        </div>
      </aside>
    </main>

    <script>
      const messages = document.querySelector('#messages');
      const startButton = document.querySelector('#startButton');
      const focusButton = document.querySelector('#focusButton');
      const endButton = document.querySelector('#endButton');
      const sendButton = document.querySelector('#sendButton');
      const composer = document.querySelector('#composer');
      const messageInput = document.querySelector('#messageInput');
      const status = document.querySelector('#status');
      const sessionStatus = document.querySelector('#sessionStatus');
      let activeSelectionRegion = 'chat';
      let playgroundMode = 'conversation';

      const debugFields = {
        selectedTool: document.querySelector('#selectedTool'),
        toolArguments: document.querySelector('#toolArguments'),
        toolResult: document.querySelector('#toolResult'),
        assistantResponse: document.querySelector('#assistantResponse'),
        conversationState: document.querySelector('#conversationState'),
        conversationIntent: document.querySelector('#conversationIntent'),
        conversationAnalysis: document.querySelector('#conversationAnalysis'),
        currentFocus: document.querySelector('#currentFocus'),
        remainingUserTurns: document.querySelector('#remainingUserTurns'),
        generatedSystemPrompt: document.querySelector('#generatedSystemPrompt'),
        openAIResponse: document.querySelector('#openAIResponse'),
        focusEvaluation: document.querySelector('#focusEvaluation'),
        nextAction: document.querySelector('#nextAction'),
        rawTrace: document.querySelector('#rawTrace'),
      };

      const sessionFields = {
        sessionId: document.querySelector('#sessionId'),
        openingScenario: document.querySelector('#openingScenario'),
        openingScenarioCategory: document.querySelector('#openingScenarioCategory'),
        assistantOpening: document.querySelector('#assistantOpening'),
        currentTurn: document.querySelector('#currentTurn'),
        startedAt: document.querySelector('#startedAt'),
        turnCount: document.querySelector('#turnCount'),
        sessionConversationState: document.querySelector(
          '#sessionConversationState',
        ),
        conversationSummary: document.querySelector('#conversationSummary'),
        lastReportPath: document.querySelector('#lastReportPath'),
      };

      function nowLabel() {
        return new Intl.DateTimeFormat('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(new Date());
      }

      function appendMessage(role, text) {
        const node = document.createElement('div');
        node.className = 'message ' + role;
        node.innerHTML =
          '<div class="bubble"></div><div class="meta">' +
          (role === 'user' ? 'User' : 'Assistant') +
          ' · ' +
          nowLabel() +
          '</div>';
        node.querySelector('.bubble').textContent = text;
        messages.appendChild(node);
        messages.scrollTop = messages.scrollHeight;
      }

      function formatJson(value) {
        return JSON.stringify(value ?? {}, null, 2);
      }

      function setLoading(isLoading) {
        startButton.disabled = isLoading;
        focusButton.disabled = isLoading;
        endButton.disabled = isLoading;
        sendButton.disabled = isLoading;
        messageInput.disabled = isLoading;
        status.textContent = isLoading ? 'Running OpenAI function call...' : 'Ready';
        status.classList.remove('error');
      }

      function setDebug(payload) {
        debugFields.selectedTool.textContent = payload.selectedTool ?? '-';
        debugFields.toolArguments.textContent = formatJson(payload.toolArguments);
        debugFields.toolResult.textContent = formatJson(payload.toolResult);
        debugFields.assistantResponse.textContent = payload.assistantMessage ?? '-';
        debugFields.conversationState.textContent = payload.conversationState ?? '-';
        debugFields.conversationIntent.textContent = payload.conversationIntent ?? '-';
        debugFields.conversationAnalysis.textContent = formatJson(
          payload.conversationAnalysis,
        );
        debugFields.nextAction.textContent = payload.nextAction ?? '-';
        debugFields.rawTrace.textContent = formatJson(payload.rawTrace);

        document.querySelectorAll('.state').forEach((node) => {
          node.classList.toggle(
            'active',
            node.dataset.state === payload.conversationState,
          );
        });
      }

      function setFocusDebug(payload) {
        debugFields.selectedTool.textContent = 'focusContinuityExperiment';
        debugFields.toolArguments.textContent = '{}';
        debugFields.toolResult.textContent = formatJson(payload);
        debugFields.assistantResponse.textContent =
          payload.assistantResponse ?? '-';
        debugFields.conversationState.textContent = 'FOCUS_CONTINUITY';
        debugFields.conversationIntent.textContent = 'FOLLOW_UP_VALIDATION';
        debugFields.conversationAnalysis.textContent = '{}';
        debugFields.currentFocus.textContent = formatJson(payload.currentFocus);
        debugFields.remainingUserTurns.textContent = String(
          payload.remainingUserTurns ?? '-',
        );
        debugFields.generatedSystemPrompt.textContent =
          payload.generatedSystemPrompt ?? '-';
        debugFields.openAIResponse.textContent = formatJson(payload.openAIResponse);
        debugFields.focusEvaluation.textContent = formatJson(payload.evaluation);
        debugFields.nextAction.textContent = 'WAIT_USER_RESPONSE';
        debugFields.rawTrace.textContent = formatJson(payload);
      }

      function setSession(session, reportPath) {
        if (!session) {
          sessionStatus.textContent = 'No active session';
          return;
        }

        sessionStatus.textContent = session.EndedAt ? 'Ended' : 'Active';
        sessionFields.sessionId.textContent = session.SessionId ?? '-';
        sessionFields.openingScenario.textContent =
          session.OpeningScenario?.id ?? '-';
        sessionFields.openingScenarioCategory.textContent =
          session.OpeningScenario?.category ?? '-';
        sessionFields.assistantOpening.textContent =
          session.AssistantOpening ?? '-';
        sessionFields.currentTurn.textContent = String(session.CurrentTurn ?? 0);
        sessionFields.startedAt.textContent = session.StartedAt ?? '-';
        sessionFields.turnCount.textContent = String(session.TurnCount ?? 0);
        sessionFields.sessionConversationState.textContent =
          session.ConversationState ?? '-';
        sessionFields.conversationSummary.textContent = formatJson(
          session.ConversationSummary,
        );

        if (reportPath) {
          sessionFields.lastReportPath.textContent = reportPath;
        }
      }

      function selectElementContents(element) {
        const range = document.createRange();
        const selection = window.getSelection();

        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      function isTextInput(element) {
        return (
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          element?.isContentEditable
        );
      }

      async function postJson(url, body) {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body ?? {}),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        return response.json();
      }

      async function runStart() {
        playgroundMode = 'conversation';
        setLoading(true);

        try {
          const payload = await postJson('/development/playground/start');
          messages.replaceChildren();
          appendMessage('assistant', payload.assistantMessage);
          setDebug(payload);
          setSession(payload.session, payload.closedSessionReportPath);
        } catch (error) {
          status.textContent = error.message;
          status.classList.add('error');
        } finally {
          setLoading(false);
        }
      }

      async function runMessage(message) {
        appendMessage('user', message);
        setLoading(true);

        try {
          const payload = await postJson('/development/playground/message', {
            message,
          });
          appendMessage('assistant', payload.assistantMessage);
          setDebug(payload);
          setSession(payload.session);
        } catch (error) {
          status.textContent = error.message;
          status.classList.add('error');
        } finally {
          setLoading(false);
        }
      }

      startButton.addEventListener('click', () => {
        runStart();
      });

      async function runFocusStart() {
        playgroundMode = 'focus';
        setLoading(true);

        try {
          const payload = await postJson('/development/playground/focus/start');
          messages.replaceChildren();
          appendMessage('assistant', payload.assistantResponse);
          setFocusDebug(payload);
          status.textContent = 'Focus continuity experiment running';
        } catch (error) {
          status.textContent = error.message;
          status.classList.add('error');
        } finally {
          setLoading(false);
        }
      }

      async function runFocusMessage(message) {
        appendMessage('user', message);
        setLoading(true);

        try {
          const payload = await postJson('/development/playground/focus/message', {
            message,
          });
          appendMessage('assistant', payload.assistantResponse);
          setFocusDebug(payload);
          status.textContent =
            payload.remainingUserTurns === 0
              ? 'Focus validation reached 5 user turns'
              : 'Focus continuity experiment running';
        } catch (error) {
          status.textContent = error.message;
          status.classList.add('error');
        } finally {
          setLoading(false);
        }
      }

      focusButton.addEventListener('click', () => {
        runFocusStart();
      });

      async function runEnd() {
        setLoading(true);

        try {
          const payload = await postJson('/development/playground/end');
          setSession(payload.session, payload.reportPath);
          status.textContent = payload.reportPath
            ? 'Session report saved'
            : 'No active session';
        } catch (error) {
          status.textContent = error.message;
          status.classList.add('error');
        } finally {
          setLoading(false);
        }
      }

      endButton.addEventListener('click', () => {
        runEnd();
      });

      document.querySelectorAll('[data-selection-region]').forEach((region) => {
        region.addEventListener('pointerdown', () => {
          activeSelectionRegion = region.dataset.selectionRegion;
        });

        region.addEventListener('focusin', () => {
          activeSelectionRegion = region.dataset.selectionRegion;
        });
      });

      document.addEventListener('keydown', (event) => {
        if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'a') {
          return;
        }

        if (isTextInput(document.activeElement)) {
          return;
        }

        event.preventDefault();

        if (activeSelectionRegion === 'debug') {
          selectElementContents(document.querySelector('#debugContent'));
          return;
        }

        if (activeSelectionRegion === 'session') {
          selectElementContents(document.querySelector('#sessionContent'));
          return;
        }

        selectElementContents(messages);
      });

      composer.addEventListener('submit', (event) => {
        event.preventDefault();
        const message = messageInput.value.trim();

        if (!message) {
          return;
        }

        messageInput.value = '';

        if (playgroundMode === 'focus') {
          runFocusMessage(message);
          return;
        }

        runMessage(message);
      });

      messageInput.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' || event.shiftKey) {
          return;
        }

        event.preventDefault();

        if (sendButton.disabled) {
          return;
        }

        composer.requestSubmit();
      });
    </script>
  </body>
</html>`;
