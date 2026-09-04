# PROJECT RULES FOR MERY

MERY is a voice-native AI companion and system interface for M4.
Always prioritize real integrations over fake or placeholder systems.

## Core Directives

1. **Real Integrations Over Simulations**:
   - Do not simulate external capabilities if a real API or service can be used.
   - Do not invent data or use mock responses when a real integration is available.
   - Never fabricate personal data (use real APIs / OAuth when requested).

2. **API Key Protocol**:
   - When a feature requires an API key, clearly inform the developer:
     - What API is needed
     - Why it is needed
     - Whether a free tier exists
     - Exactly where the API key should be added
   - Whenever an API key is required, STOP and provide:
     ```text
     FEATURE: <name of the feature>
     API: <name of the required API service>
     FREE TIER AVAILABLE: <Yes/No and details>
     WHERE TO GET KEY: <direct link or instructions to obtain key>
     WHERE TO INSERT KEY: <exact file path (.env / .env.example) and variable name>
     ```
     Then wait for the key before continuing.

3. **Cost & Tier Selection**:
   - Prefer free or free-tier APIs whenever possible (e.g., Open-Meteo, Google AI Studio Gemini API, Web Speech API, Firebase Spark plan).
   - If a feature cannot be implemented without a paid service, explain that clearly and suggest free alternatives first.

4. **Modular Architecture**:
   - Keep all API integrations modular in dedicated utility/service modules so providers can be cleanly swapped without rewriting core business logic.

5. **Domain Implementations**:
   - **Voice**: Real speech-to-text (Web Speech API / Gemini Live API) and real text-to-speech (Gemini Audio TTS endpoint / native speech synthesis).
   - **Memory**: Real database persistence (Firestore / durable storage) rather than volatile ephemeral state.
   - **Weather**: Real weather API (e.g., Open-Meteo free tier API).
   - **Calendar**: Real calendar integration (Google Workspace Calendar API with OAuth).
   - **Notifications**: Real Web / OS Notification API (`Notification.requestPermission()`).
   - **System Control**: Actual browser/desktop platform capabilities and Web APIs.
