# Vibe-Graud-html-css-js-project

VibeGrad is a web-based code review and optimization tool built with HTML, CSS, and JavaScript. It analyzes code quality, identifies issues, and provides suggestions to refine, clean, and optimize development projects efficiently.

## AI Audit Integration

The application can perform an AI-powered logic audit of your code using external APIs. It currently supports:

- **OpenAI** (`sk-` prefix) using GPT-4o/GPT-4o-mini models
- **Anthropic Claude** (`claude-` prefix) via the Claude API

Just store your key in localStorage under `vg_api_key` and the appropriate service will be used automatically during scans.

## Chatbot

A simple AI chatbot is available on the landing page. It uses the same API key to answer general questions and help you explore features. No setup required beyond saving your OpenAI or Claude key.
