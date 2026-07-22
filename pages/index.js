import React, { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { useConversation } from "../hooks/useConversation";

const BOT_AVATAR =
  "https://imageio.forbes.com/specials-images/imageserve/5ed00f17d4a99d0006d2e738/0x0.jpg?format=jpg&crop=4666,4663,x154,y651,safe&height=416&width=416&fit=bounds";

// Kanye-flavored copy (see yegpt-ui.md)
const PLACEHOLDER_PROMPTS = [
  "How do I become legendary?",
  "Explain quantum physics.",
  "Rate my startup.",
  "Should I text my ex?",
  "Why is CSS like this?",
  "How do I become rich?",
  "Write my resignation speech.",
  "Convince my friend pineapple belongs on pizza.",
  "Design the next billion-dollar app.",
  "How do I get more aura?",
];

const SUGGESTION_PROMPTS = [
  "How do I become legendary?",
  "Rate my startup.",
  "Should I text my ex?",
  "Why is CSS like this?",
  "How do I get more aura?",
  "Design the next billion-dollar app.",
];

const LOADING_MESSAGES = [
  "Interrupting Taylor's acceptance speech...",
  "Calling Mike Dean...",
  "Thinking in 808s...",
  "Reinventing minimalism...",
  "Producing your answer...",
  "Building another masterpiece...",
  "Asking if this deserves a Grammy...",
  "Downloading confidence...",
  "Updating the vision...",
  "Arguing with the algorithm...",
  "Redesigning civilization...",
  "Making your answer iconic...",
  "Generating album-quality ideas...",
  "Cooking.",
  "Actually...",
  "Slow cooking.",
];

const ERROR_MESSAGES = [
  "Creative overload.",
  "Too much aura detected.",
  "Grammy servers unavailable.",
  "Vision exceeded browser limits.",
  "Unexpected confidence overflow.",
  "The algorithm wasn't ready.",
  "Answer delayed while redesigning reality.",
  "Your prompt wasn't ambitious enough.",
  "Maximum creativity exceeded.",
];

const RETRY_MESSAGES = [
  "Run it back.",
  "Version two is always cleaner.",
  "Every classic gets remastered.",
  "Let's produce another take.",
];

const IDLE_QUOTES = [
  "Confidence is free. Vision isn't.",
  "Small ideas make me itchy.",
  "Everything is design. Everything is architecture.",
  "Normal is just beta software.",
  "Innovation is expensive.",
  "If everyone agrees immediately, the idea probably isn't ambitious enough.",
];

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

function YeChat() {
  const { messages, isSending, error, send, retry, reset } = useConversation();
  const [userInput, setUserInput] = useState("");
  const [loadingText, setLoadingText] = useState(LOADING_MESSAGES[0]);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [idleQuote, setIdleQuote] = useState(IDLE_QUOTES[0]);
  const [errorFlavor, setErrorFlavor] = useState(ERROR_MESSAGES[0]);
  const [retryFlavor, setRetryFlavor] = useState(RETRY_MESSAGES[0]);
  const [confirmReset, setConfirmReset] = useState(false);
  const msgContainer = useRef(null);
  const inputRef = useRef(null);

  const isEmpty = messages.length === 0;
  const lastMessage = messages[messages.length - 1];
  const hasFailed = lastMessage?.status === "failed";

  useEffect(() => {
    const lastMsg = msgContainer?.current?.lastElementChild;
    lastMsg?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isSending, hasFailed]);

  useEffect(() => {
    // Randomize the flavor text only on the client to avoid an SSR/CSR
    // hydration mismatch (the server can't know which random line to render).
    setIdleQuote(pickRandom(IDLE_QUOTES));
    setErrorFlavor(pickRandom(ERROR_MESSAGES));
    setRetryFlavor(pickRandom(RETRY_MESSAGES));
  }, []);

  // Re-roll the failure flavor text each time a new error lands
  useEffect(() => {
    if (!error) return;
    setErrorFlavor(pickRandom(ERROR_MESSAGES));
    setRetryFlavor(pickRandom(RETRY_MESSAGES));
  }, [error]);

  // Rotate the Ye-style loading caption while he's "cooking"
  useEffect(() => {
    if (!isSending) return;
    setLoadingText(pickRandom(LOADING_MESSAGES));
    const id = setInterval(() => {
      setLoadingText(pickRandom(LOADING_MESSAGES));
    }, 1800);
    return () => clearInterval(id);
  }, [isSending]);

  // Rotate the input placeholder prompts when the field is idle
  useEffect(() => {
    if (userInput || isSending) return;
    const id = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_PROMPTS.length);
    }, 3000);
    return () => clearInterval(id);
  }, [userInput, isSending]);

  // Auto-grow the textarea to fit its content (up to the CSS max-height).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [userInput]);

  const handleChange = (event) => {
    setUserInput(event.target.value);
  };

  const submitMessage = () => {
    if (!userInput.trim() || isSending) return;
    send(userInput);
    setUserInput("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submitMessage();
  };

  // Enter sends; Shift+Enter inserts a newline (default textarea behavior).
  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  };

  const handleReset = () => {
    reset();
    setUserInput("");
    setIdleQuote(pickRandom(IDLE_QUOTES));
    setConfirmReset(false);
  };

  const handleSuggestion = (prompt) => {
    if (isSending) return;
    send(prompt);
    inputRef.current?.focus();
  };

  return (
    <>
      <Head>
        <title>YeGPT - Kanye West AI Chatbot</title>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <div className="chat-container">
        <div className="header">
          <i className="fa fa-chevron-left back-button"></i>
          <div className="contact-info">
            <img
              className="header-image"
              src={BOT_AVATAR}
              alt="Profile"
            />
            <h2 className="name">YeGPT</h2>
            <span className="status">online • touchin the sky ✨</span>
          </div>
          <button
            className="reset-button"
            onClick={() => setConfirmReset(true)}
            disabled={isEmpty || isSending}
            title="Start fresh"
            aria-label="Reset conversation"
          >
            <i className="fa fa-trash-o" aria-hidden="true"></i>
          </button>
        </div>

        {confirmReset && (
          <div className="modal-overlay" onClick={() => setConfirmReset(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Delete this conversation?</h3>
              <p className="modal-subtitle">Even classics get archived.</p>
              <div className="modal-actions">
                <button
                  className="modal-btn ghost"
                  onClick={() => setConfirmReset(false)}
                >
                  Keep it
                </button>
                <button className="modal-btn danger" onClick={handleReset}>
                  Start fresh
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="chat-window">
          <p className="chat-bot-header">
            Powered by{" "}
            <a
              className="ref-link"
              href="http://metaschool.so/"
              target="_blank"
              rel="noopener noreferrer"
            >
              metaschool 🔮
            </a>{" "}
            · Developed by{" "}
            <a
              className="ref-link"
              href="http://devfoliomoonman369.netlify.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              moonman369 🎆
            </a>
          </p>

          {isEmpty ? (
            <div className="welcome-screen">
              <h1 className="hero-title">Ask YeGPT Anything.</h1>
              <p className="hero-subtitle">
                Every answer comes with maximum confidence, questionable
                humility, and enough creative energy to redesign reality.
              </p>
              <p className="welcome-line">
                Some people search. Visionaries ask YeGPT.
              </p>
              <div className="suggestion-grid">
                {SUGGESTION_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    className="suggestion-chip"
                    onClick={() => handleSuggestion(prompt)}
                    disabled={isSending}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <p className="idle-quote">“{idleQuote}”</p>
            </div>
          ) : (
            <div className="message-list" ref={msgContainer}>
              {messages.map((message) => (
                <div key={message.id} className="message-container">
                  {message.role === "user" ? (
                    <>
                      <div
                        className={`user-message message${
                          message.status === "failed" ? " failed" : ""
                        }${message.status === "pending" ? " pending" : ""}`}
                      >
                        <div className="message-text">{message.content}</div>
                      </div>
                      <span
                        className="profile-image user-image"
                        aria-label="You"
                      >
                        <i className="fa fa-user" aria-hidden="true"></i>
                      </span>
                    </>
                  ) : (
                    <>
                      <img
                        className="profile-image bot-image"
                        src={BOT_AVATAR}
                        alt="Bot Profile"
                      />
                      <div className="bot-message message">
                        <div className="message-text">{message.content}</div>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {isSending && (
                <div className="message-container">
                  <img
                    className="profile-image bot-image"
                    src={BOT_AVATAR}
                    alt="Bot Profile"
                  />
                  <div className="loading-bubble">
                    <img
                      className="typing-bubble"
                      src="https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExODg3ZjFlNzQ1Mzc1ZTFlNTMyZTVjODIzMDYyODUwNDQ0ZDY3ZmU5YyZjdD1z/3tLfKrc4pLWiTkAAph/giphy.gif"
                      alt="Ye typing"
                    />
                    <span className="loading-text">{loadingText}</span>
                  </div>
                </div>
              )}

              {hasFailed && !isSending && (
                <div className="retry-row">
                  <span className="retry-flavor" title={error || undefined}>
                    {errorFlavor}
                  </span>
                  <button
                    className="retry-button"
                    onClick={() => retry(lastMessage.id)}
                  >
                    <i className="fa fa-repeat" aria-hidden="true"></i>{" "}
                    {retryFlavor}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <form className="form" onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            className="chat-input"
            rows={1}
            placeholder={PLACEHOLDER_PROMPTS[placeholderIdx]}
            value={userInput}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={isSending}
          />
          <button type="submit" disabled={isSending}>
            <i className="fa fa-paper-plane" aria-hidden="true"></i>
          </button>
        </form>
        <p className="disclaimer">
          Built for entertainment. YeGPT is a parody chatbot inspired by meme &
          pop culture — responses are fictional and comedic, and do not
          represent Kanye West&apos;s real opinions.
        </p>
      </div>
    </>
  );
}

export default YeChat;
