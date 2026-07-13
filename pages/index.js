import React, { useEffect, useRef, useState } from "react";
import Head from "next/head";
import axios from "axios";
import { useCookies } from "react-cookie";

const BOT_AVATAR =
  "https://imageio.forbes.com/specials-images/imageserve/5ed00f17d4a99d0006d2e738/0x0.jpg?format=jpg&crop=4666,4663,x154,y651,safe&height=416&width=416&fit=bounds";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const BACKEND_PATH = process.env.NEXT_PUBLIC_BACKEND_PATH;

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
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [cookies, setCookies] = useCookies({
    messages: [],
  });
  const [kanyeTyping, setKanyeTyping] = useState(false);
  const [loadingText, setLoadingText] = useState(LOADING_MESSAGES[0]);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [idleQuote, setIdleQuote] = useState(IDLE_QUOTES[0]);
  const msgContainer = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const lastMsg = msgContainer?.current?.lastElementChild;
    lastMsg?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    const local = localStorage.getItem("messages");
    localStorage.clear();
    localStorage.setItem("messages", local);

    setMessages(
      JSON.parse(localStorage.getItem("messages")) || cookies?.messages || []
    );

    // Randomize the idle quote only on the client to avoid an SSR/CSR
    // hydration mismatch (the server can't know which random line to render).
    setIdleQuote(pickRandom(IDLE_QUOTES));
  }, []);

  // Rotate the Ye-style loading caption while he's "cooking"
  useEffect(() => {
    if (!kanyeTyping) return;
    setLoadingText(pickRandom(LOADING_MESSAGES));
    const id = setInterval(() => {
      setLoadingText(pickRandom(LOADING_MESSAGES));
    }, 1800);
    return () => clearInterval(id);
  }, [kanyeTyping]);

  // Rotate the input placeholder prompts when the field is idle
  useEffect(() => {
    if (userInput || kanyeTyping) return;
    const id = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_PROMPTS.length);
    }, 3000);
    return () => clearInterval(id);
  }, [userInput, kanyeTyping]);

  const handleChange = (event) => {
    setUserInput(event.target.value);
  };

  const sendMessage = (text) => {
    const newMessage = { user: true, text };
    setMessages([...messages, newMessage, { user: false, text: "loading" }]);
    setKanyeTyping(true);
    axios
      .post(
        `${BACKEND_URL}${BACKEND_PATH}`,
        {
          message: text,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
      .then((response) => {
        const botResponse = {
          user: false,
          text: response.data.results[0].response,
        };
        setCookies("messages", [...messages, newMessage, botResponse]);
        localStorage.setItem(
          "messages",
          JSON.stringify([...messages, newMessage, botResponse])
        );
        setMessages([...messages, newMessage, botResponse]);
        setKanyeTyping(false);
      })
      .catch((error) => {
        console.error(error);
        const botResponse = {
          user: false,
          text: pickRandom(ERROR_MESSAGES),
        };
        setCookies("messages", [...messages, newMessage, botResponse]);
        localStorage.setItem(
          "messages",
          JSON.stringify([...messages, newMessage, botResponse])
        );
        setMessages([...messages, newMessage, botResponse]);
        setKanyeTyping(false);
      });
    setUserInput("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (userInput && !kanyeTyping) {
      sendMessage(userInput);
    }
  };

  const handleSuggestion = (prompt) => {
    if (kanyeTyping) return;
    sendMessage(prompt);
    inputRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

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
          <i className="fa fa-video-camera video-icon"></i>
        </div>
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
                    disabled={kanyeTyping}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <p className="idle-quote">“{idleQuote}”</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className="message-container" ref={msgContainer}>
                {message.user ? (
                  <>
                    <div className="user-message message">
                      <div className="message-text">{message.text}</div>
                    </div>
                    <span className="profile-image user-image" aria-label="You">
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
                    {message.text === "loading" ? (
                      <div className="loading-bubble">
                        <img
                          className="typing-bubble"
                          src="https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExODg3ZjFlNzQ1Mzc1ZTFlNTMyZTVjODIzMDYyODUwNDQ0ZDY3ZmU5YyZjdD1z/3tLfKrc4pLWiTkAAph/giphy.gif"
                          alt="Ye typing"
                        />
                        <span className="loading-text">{loadingText}</span>
                      </div>
                    ) : (
                      <div className="bot-message message">
                        <div className="message-text">{message.text}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>
        <form className="form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            placeholder={PLACEHOLDER_PROMPTS[placeholderIdx]}
            value={userInput}
            onChange={handleChange}
            disabled={kanyeTyping}
          />
          <button type="submit" disabled={kanyeTyping}>
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
