### Requirement: Browser-callable no-key itinerary generation
The system SHALL generate travel itineraries by calling a no-key provider endpoint directly from the browser, without requiring client-side secret configuration.

#### Scenario: Create itinerary without API key setup
- **WHEN** a user submits a new trip request in a fresh local environment
- **THEN** the system sends the request directly from the browser to the selected no-key provider and returns a parsed `TravelItinerary` on success

### Requirement: Browser-callable no-key itinerary refinement
The system SHALL refine an existing itinerary by sending the latest user prompt, recent chat history, and current itinerary context to the same browser-callable no-key provider.

#### Scenario: Refine existing itinerary in browser-only mode
- **WHEN** a user submits a refinement request for an existing trip
- **THEN** the system calls the no-key provider from the browser and returns an updated parsed `TravelItinerary`

### Requirement: Local validation of provider responses
The system SHALL validate and normalize provider responses locally before the UI consumes them, including assigning local activity IDs after successful parsing.

#### Scenario: Provider returns valid itinerary JSON
- **WHEN** the provider response contains the required itinerary fields
- **THEN** the system parses the response, injects activity IDs, and returns a normalized `TravelItinerary`

#### Scenario: Provider returns invalid or incomplete content
- **WHEN** the provider response is empty, malformed, or missing required itinerary fields
- **THEN** the system fails the request with a clear application error and SHALL NOT return partial itinerary data

### Requirement: Browser compatibility failure handling
The system SHALL surface a clear user-facing failure when the no-key provider cannot be reached from the browser because of network errors, CORS restrictions, or provider-side availability issues.

#### Scenario: Provider request is blocked in browser
- **WHEN** a browser request to the provider fails because of CORS or network unavailability
- **THEN** the system reports that itinerary generation is temporarily unavailable instead of silently failing
