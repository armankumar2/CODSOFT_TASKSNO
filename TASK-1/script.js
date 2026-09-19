// Local Rule Engine Data
const rules = [
  {
    intent: 'Greeting',
    pattern: '\\b(hello|hi|hey|greetings)\\b',
    ruleName: 'greeting_response',
    responses: [
      'Hello! How can I help you today?',
      'Hi there! What can I do for you?',
      'Greetings! How may I assist you?'
    ]
  },
  {
    intent: 'Help',
    pattern: '\\b(help|assist|support|what can you do)\\b',
    ruleName: 'help_response',
    responses: [
      'I can answer basic questions based on predefined rules. Try asking for my name, or say hello!',
      'I am a rule-based chatbot. I can help you test intent detection.'
    ]
  },
  {
    intent: 'Identity',
    pattern: '\\b(who are you|your name|what are you)\\b',
    ruleName: 'identity_response',
    responses: [
      'I am RuleBot, a simple Rule-Based chatbot.',
      'My name is RuleBot.'
    ]
  },
  {
    intent: 'Internet Search',
    pattern: '(?:who is|what is|tell me about|search for) (.*)',
    ruleName: 'wikipedia_fetch',
    responses: [
      'Fetching information from the web...'
    ]
  },
  {
    intent: 'Capabilities',
    pattern: '\\b(what do you know|capabilities|features)\\b',
    ruleName: 'capabilities_response',
    responses: [
      'I know how to match simple text patterns to predefined intents.',
      'My capabilities include pattern matching, intent detection, and returning predefined responses.'
    ]
  },
  {
    intent: 'Coding Example',
    pattern: '\\b(armstrong number|code of armstrong|armstrong in python)\\b',
    ruleName: 'code_armstrong',
    responses: [
      "Here is how you check for an Armstrong number in Python:\n\n```python\nnum = int(input('Enter a number: '))\nsum = 0\ntemp = num\n\n# Calculate sum of cubes of each digit\nwhile temp > 0:\n    digit = temp % 10\n    sum += digit ** 3\n    temp //= 10\n\nif num == sum:\n    print(num, 'is an Armstrong number')\nelse:\n    print(num, 'is not an Armstrong number')\n```"
    ]
  },
  {
    intent: 'Coding Example',
    pattern: '\\b(fibonacci|fibonacci sequence)\\b',
    ruleName: 'code_fibonacci',
    responses: [
      "Here is a simple Fibonacci sequence generator in Python:\n\n```python\ndef fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        yield a\n        a, b = b, a + b\n\nprint(list(fib(10)))\n```"
    ]
  },
  {
    intent: 'Thanks',
    pattern: '\\b(thank you|thanks|appreciate)\\b',
    ruleName: 'thanks_response',
    responses: [
      'You are very welcome!',
      'No problem at all.',
      'Happy to help!'
    ]
  },
  {
    intent: 'Goodbye',
    pattern: '\\b(bye|goodbye|see you|farewell)\\b',
    ruleName: 'goodbye_response',
    responses: [
      'Goodbye! Have a great day.',
      'See you later!',
      'Take care!'
    ]
  }
];

function processLocalQuery(query) {
  const normalizedQuery = query.toLowerCase().trim();
  for (const rule of rules) {
    const regex = new RegExp(rule.pattern, 'i');
    if (regex.test(normalizedQuery)) {
      const match = normalizedQuery.match(regex);
      let searchTerm = match && match[1] ? match[1].trim() : null;
      
      if (searchTerm) {
        // Aggressively remove all trailing non-alphanumeric characters (quotes, punctuation, etc)
        searchTerm = searchTerm.replace(/[^a-zA-Z0-9]+$/, '').trim();
        // Wikipedia API expects proper capitalization (Title_Case)
        searchTerm = searchTerm.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('_');
      }
      
      const randomResponse = rule.responses[Math.floor(Math.random() * rule.responses.length)];
      return {
        intent: rule.intent,
        pattern: `“${rule.pattern.replace(/\\b/g, '')}”`,
        ruleName: rule.ruleName,
        response: randomResponse,
        searchTerm: searchTerm
      };
    }
  }
  return {
    intent: 'Unknown',
    pattern: 'N/A',
    ruleName: 'fallback',
    response: "I'm not sure I understand that yet. Try asking about my capabilities, identity, help, greetings, or try asking 'Who is [name]' to search the web."
  };
}

// Global State
let currentSessionId = Date.now().toString();
let sessions = JSON.parse(localStorage.getItem('rulebot_sessions') || '{}');

if (!sessions[currentSessionId]) {
  sessions[currentSessionId] = { id: currentSessionId, title: 'New Chat', messages: [] };
}

// DOM Elements
const sidebar = document.getElementById('sidebar');
const mobileOverlay = document.getElementById('mobileOverlay');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navItems = document.querySelectorAll('.nav-item');
const viewSections = document.querySelectorAll('.view-section');
const newChatBtn = document.getElementById('newChatBtn');
const recentChatsList = document.getElementById('recentChatsList');

const chatMessagesContainer = document.getElementById('chatMessagesContainer');
const welcomeState = document.getElementById('welcomeState');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const errorAlert = document.getElementById('errorAlert');
const composerContainer = document.getElementById('composerContainer');

const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');

let isTyping = false;

// Initialize marked.js
marked.setOptions({ breaks: true, gfm: true });

// Theme Logic
let isDarkMode = localStorage.getItem('rulebot_theme') === 'dark';
function applyTheme() {
  if (isDarkMode) {
    document.body.classList.add('dark-theme');
    themeIcon.innerHTML = `<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />`;
  } else {
    document.body.classList.remove('dark-theme');
    themeIcon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;
  }
}
themeToggleBtn.addEventListener('click', () => {
  isDarkMode = !isDarkMode;
  localStorage.setItem('rulebot_theme', isDarkMode ? 'dark' : 'light');
  applyTheme();
});
applyTheme();

// History Logic
function saveSessions() {
  localStorage.setItem('rulebot_sessions', JSON.stringify(sessions));
  renderHistory();
}

function renderHistory() {
  recentChatsList.innerHTML = '';
  const sortedSessions = Object.values(sessions).sort((a, b) => b.id - a.id);
  
  sortedSessions.forEach(session => {
    if (session.messages.length === 0 && session.id !== currentSessionId) return;
    
    const div = document.createElement('div');
    div.className = `recent-chat-item ${session.id === currentSessionId ? 'active' : ''}`;
    
    let title = session.title;
    if (title === 'New Chat' && session.messages.length > 0) {
      title = session.messages[0].text.substring(0, 20) + '...';
      session.title = title;
      localStorage.setItem('rulebot_sessions', JSON.stringify(sessions));
    }
    
    div.innerHTML = `
      <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:80%;">${title}</span>
      <svg class="del-chat-btn" data-id="${session.id}" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="cursor:pointer; opacity:0.5; padding: 2px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
    `;
    
    div.addEventListener('click', (e) => {
      if(e.target.closest('.del-chat-btn')) {
        const id = e.target.closest('.del-chat-btn').getAttribute('data-id');
        delete sessions[id];
        if (id === currentSessionId) startNewChat();
        else saveSessions();
        return;
      }
      loadChat(session.id);
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
        mobileOverlay.classList.remove('open');
      }
    });
    recentChatsList.appendChild(div);
  });
}

function loadChat(id) {
  currentSessionId = id;
  chatMessagesContainer.innerHTML = '';
  
  const currentSession = sessions[id];
  if (currentSession.messages.length === 0) {
    welcomeState.style.display = 'flex';
    chatMessagesContainer.style.display = 'none';
  } else {
    welcomeState.style.display = 'none';
    chatMessagesContainer.style.display = 'flex';
    currentSession.messages.forEach(msg => renderMessageNode(msg.sender, msg.text, msg.metadata, false));
    setTimeout(() => { hljs.highlightAll(); scrollToBottom(); }, 100);
  }
  window.setView('chat');
  renderHistory();
}

function startNewChat() {
  currentSessionId = Date.now().toString();
  sessions[currentSessionId] = { id: currentSessionId, title: 'New Chat', messages: [] };
  saveSessions();
  loadChat(currentSessionId);
}
newChatBtn.addEventListener('click', startNewChat);

// Initialize Intents Page
function renderIntentsPage() {
  const intentsGrid = document.getElementById('intentsGrid');
  let html = '';
  rules.forEach(rule => {
    const examplesHtml = rule.pattern.replace(/\\b/g, '').replace(/\(/g, '').replace(/\)/g, '').replace(/\?\:/g, '').split('|').map(ex => `<li class="intent-example-item">"${ex.replace('^', '').replace(' (.*)', ' [topic]')}"</li>`).join('');
    html += `
      <div class="intent-card">
        <div class="intent-card-header">
          <div class="intent-card-title">${rule.intent}</div>
          <div class="intent-badge">${rule.responses.length} Rules</div>
        </div>
        <div class="intent-card-desc">Matches patterns related to ${rule.intent.toLowerCase()}.</div>
        <div class="intent-examples-title">Example Patterns</div>
        <ul class="intent-examples-list">${examplesHtml}</ul>
      </div>
    `;
  });
  
  // Add Unknown fallback
  html += `
    <div class="intent-card">
      <div class="intent-card-header">
        <div class="intent-card-title">Unknown</div>
        <div class="intent-badge">Fallback</div>
      </div>
      <div class="intent-card-desc">Fallback for unsupported queries.</div>
      <div class="intent-examples-title">Example Patterns</div>
      <ul class="intent-examples-list">
        <li class="intent-example-item">.*</li>
      </ul>
    </div>
  `;
  
  intentsGrid.innerHTML = html;
}
renderIntentsPage();

// Navigation Logic
window.setView = function(viewId) {
  navItems.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-view') === viewId));
  viewSections.forEach(section => section.classList.toggle('active', section.id === `view-${viewId}`));
  composerContainer.style.display = viewId === 'chat' ? 'block' : 'none';
  if (window.innerWidth <= 768) {
    sidebar.classList.remove('open');
    mobileOverlay.classList.remove('open');
  }
}

navItems.forEach(btn => btn.addEventListener('click', () => setView(btn.getAttribute('data-view'))));

mobileMenuBtn.addEventListener('click', () => {
  sidebar.classList.add('open');
  mobileOverlay.classList.add('open');
});
mobileOverlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  mobileOverlay.classList.remove('open');
});

// Chat Logic
function showError(msg) {
  errorAlert.textContent = msg;
  errorAlert.style.display = 'block';
  setTimeout(() => errorAlert.style.display = 'none', 3000);
}

function scrollToBottom() {
  const contentContainer = document.getElementById('contentContainer');
  contentContainer.scrollTo({ top: contentContainer.scrollHeight, behavior: 'smooth' });
}

function renderMessageNode(sender, text, metadata = null, animate = true) {
  if (welcomeState.style.display !== 'none') {
    welcomeState.style.display = 'none';
    chatMessagesContainer.style.display = 'flex';
  }
  
  const msgWrapper = document.createElement('div');
  msgWrapper.className = `message-wrapper ${sender}`;
  
  let html = '';
  if (sender === 'bot') {
    html += `
      <div class="bot-avatar-container">
        <div class="bot-avatar">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
        </div>
        <span class="bot-name">RuleBot</span>
      </div>
    `;
  }
  
  const renderedText = sender === 'bot' ? marked.parse(text) : text;
  html += `<div class="message-bubble">${renderedText}</div>`;
  
  if (metadata) {
    html += `
      <div class="intent-details-container">
        <div class="intent-details-toggle" onclick="this.classList.toggle('expanded')">
          <span>Detected Intent: ${metadata.intent}</span>
          <svg class="chevron-right" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
        <div class="intent-details-content">
          <div class="intent-row">
            <span class="intent-label">Matched Pattern</span>
            <span class="intent-value">${metadata.pattern}</span>
          </div>
          <div class="intent-row">
            <span class="intent-label">Response Rule</span>
            <span class="intent-value">${metadata.ruleName}</span>
          </div>
        </div>
      </div>
    `;
    
    if (metadata.intent === 'Unknown') {
      html += `
        <button class="view-intents-btn" onclick="setView('intents')" style="margin-top: 8px; font-size: 0.75rem; color: var(--primary); background: none; border: none; cursor: pointer; text-decoration: underline;">
          View Supported Intents
        </button>
      `;
    }
  }
  
  msgWrapper.innerHTML = html;
  chatMessagesContainer.appendChild(msgWrapper);
  if (animate) scrollToBottom();
}

function showTypingIndicator() {
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper bot';
  wrapper.id = 'typingIndicator';
  wrapper.innerHTML = `
    <div class="bot-avatar-container">
      <div class="bot-avatar">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
      </div>
      <span class="bot-name">RuleBot</span>
    </div>
    <div class="typing-indicator">
      <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
      Processing...
    </div>
  `;
  chatMessagesContainer.appendChild(wrapper);
  scrollToBottom();
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) indicator.remove();
}

async function fetchWikipedia(term) {
  try {
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`);
    if (response.status === 404) return null;
    const data = await response.json();
    return data.extract || null;
  } catch (e) {
    return null;
  }
}

async function fetchDuckDuckGo(term) {
  try {
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(term)}&format=json`);
    const data = await response.json();
    if (data.AbstractText) {
      return data.AbstractText;
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function scrapeWebSearch(term) {
  try {
    const targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(term)}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
    const response = await fetch(proxyUrl);
    const data = await response.json();
    
    if (data.contents) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, 'text/html');
      // DuckDuckGo HTML uses .result__snippet for search text
      const snippets = Array.from(doc.querySelectorAll('.result__snippet'))
                            .slice(0, 3)
                            .map(el => el.textContent.trim());
      
      if (snippets.length > 0) {
        return "I scraped the web and found this:<br><br>• " + snippets.join("<br><br>• ");
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function handleSendMessage(text) {
  if (!text || !text.trim()) {
    showError('Please enter a message first.');
    return;
  }
  
  renderMessageNode('user', text, null);
  sessions[currentSessionId].messages.push({ sender: 'user', text, metadata: null });
  saveSessions();
  
  chatInput.value = '';
  updateSendButtonState();
  
  isTyping = true;
  chatInput.disabled = true;
  sendBtn.disabled = true;
  showTypingIndicator();
  
  let result = processLocalQuery(text);
  
  if (result.intent === 'Internet Search' && result.searchTerm) {
    let answer = await fetchWikipedia(result.searchTerm);
    
    if (answer) {
      result.ruleName = 'wikipedia_api_success';
      result.response = answer;
    } else {
      // Wikipedia Failed -> Try DuckDuckGo
      const rawTerm = result.searchTerm.replace(/_/g, ' ');
      const ddgAnswer = await fetchDuckDuckGo(rawTerm);
      
      if (ddgAnswer) {
        result.ruleName = 'duckduckgo_api_success';
        result.response = ddgAnswer;
      } else {
        // Both Failed -> Stealth CORS Scrape
        const scraped = await scrapeWebSearch(rawTerm);
        if (scraped) {
          result.ruleName = 'stealth_web_scrape';
          result.response = scraped;
        } else {
          result.ruleName = 'google_search_fallback';
          result.response = `I searched the web but couldn't scrape a direct answer. <br><br> <a href="https://www.google.com/search?q=${encodeURIComponent(rawTerm)}" target="_blank" class="new-chat-btn" style="text-decoration:none; display:inline-block; margin-top:8px;">Search Google Manually</a>`;
        }
      }
    }
  } else if (result.intent === 'Unknown') {
    // Unknown Intent -> Stealth CORS Scrape
    const scraped = await scrapeWebSearch(text);
    if (scraped) {
      result.ruleName = 'stealth_web_scrape';
      result.response = scraped;
    } else {
      result.response = `I'm not sure I understand that locally. <br><br> <a href="https://www.google.com/search?q=${encodeURIComponent(text)}" target="_blank" class="new-chat-btn" style="text-decoration:none; display:inline-block; margin-top:8px;">Search Google Manually</a>`;
    }
  } else {
    await new Promise(r => setTimeout(r, 600)); // Simulate local processing
  }
  
  removeTypingIndicator();
  renderMessageNode('bot', result.response, result);
  sessions[currentSessionId].messages.push({ sender: 'bot', text: result.response, metadata: result });
  saveSessions();
  
  setTimeout(() => hljs.highlightAll(), 50);
  
  isTyping = false;
  chatInput.disabled = false;
  updateSendButtonState();
  chatInput.focus();
}

// Input Event Listeners
function updateSendButtonState() {
  sendBtn.disabled = !(chatInput.value.trim() && !isTyping);
}

chatInput.addEventListener('input', updateSendButtonState);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!isTyping) handleSendMessage(chatInput.value);
  }
});
sendBtn.addEventListener('click', () => {
  if (!isTyping) handleSendMessage(chatInput.value);
});

document.querySelectorAll('.prompt-card').forEach(card => {
  card.addEventListener('click', () => handleSendMessage(card.getAttribute('data-prompt')));
});

// Init
renderHistory();
loadChat(currentSessionId);
