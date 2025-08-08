# Configuration Guide

This application supports extensive configuration through a `config.json` file. Copy `config.example.json` to `config.json` and customize as needed.

## Configuration Options

### Filters

Control which events are included or excluded:

```json
"filters": {
  "eventTitles": ["Meeting to skip", "Lunch"],  // Events containing these titles are filtered out
  "eventRegex": "^(Draft|Tentative)",           // Regex pattern to filter events
  "includeAllDay": false,                       // Include all-day events
  "minDurationMinutes": 15,                     // Minimum event duration to include
  "maxDurationHours": 8,                        // Maximum event duration to include
  "businessHoursOnly": true,                    // Only include events during business hours
  "businessHours": {
    "start": 9,                                 // Business hours start (24h format)
    "end": 17                                   // Business hours end (24h format)
  }
}
```


### Formatting

Control how events are displayed:

```json
"formatting": {
  "dateFormat": "YYYY-MM-DD",                   // Date format (not yet implemented)
  "timeFormat24h": false,                       // Use 24-hour time format
  "showAttendees": true,                        // Show attendee names
  "maxAttendeesShown": 10,                      // Maximum attendees to list
  "showLocation": true,                         // Show meeting location
  "showMeetingLinks": true,                     // Show video call links
  "meetingLinkText": "Call Link",               // Text for meeting links
  "groupByTimeOfDay": false,                    // Group meetings by time (not yet implemented)
  "includeEmojis": {                           // Emojis for different meeting types
    "videoCall": "📹",
    "phoneCall": "📞", 
    "inPerson": "🤝",
    "unknown": ""
  }
}
```

### Output

Control the output structure:

```json
"output": {
  "headerTemplate": {
    "includeNavigation": true,                   // Include prev/next day links
    "includeTasks": true,                        // Include task sections
    "taskCategories": [                          // Task categories to include
      {
        "name": "ASAP",
        "query": "tag:ASAP/TODO"
      },
      {
        "name": "Email for Reply",
        "query": "(path:/emails) AND (tag:send/TODO)"
      }
    ]
  },
  "meetingTemplate": {
    "format": "### {emoji} {title} #{tag}",      // Meeting header format
    "includeTime": true,                         // Include meeting times
    "includeAttendees": true,                    // Include attendee list
    "includeLink": true,                         // Include meeting links
    "includeNoteLink": true,                     // Include note links
    "includeLocation": true                      // Include location info
  }
}
```

### Advanced

Advanced options (not yet implemented):

```json
"advanced": {
  "cacheEnabled": false,                         // Enable caching
  "cacheDurationMinutes": 5,                    // Cache duration
  "retryAttempts": 3,                           // API retry attempts
  "retryDelayMs": 1000                          // Delay between retries
}
```

## Environment Variable Overrides

Some configuration can be overridden via environment variables:

- `EVENTS_FILTER` - Comma-separated list of event titles to filter (overrides config.json)
- `DAILY_NOTE_PATH` - Path where daily notes are saved

## Examples

### Minimal Configuration

Only show important meetings:

```json
{
  "filters": {
    "eventTitles": ["Blocked", "Focus Time", "Lunch"],
    "minDurationMinutes": 30,
    "businessHoursOnly": true
  }
}
```

### Executive Summary

Show only meeting titles and times:

```json
{
  "formatting": {
    "showAttendees": false,
    "showLocation": false,
    "showMeetingLinks": false
  },
  "output": {
    "headerTemplate": {
      "includeTasks": false
    }
  }
}
```

### Full Details

Include everything:

```json
{
  "filters": {
    "includeAllDay": true,
    "minDurationMinutes": 0
  },
  "formatting": {
    "showAttendees": true,
    "maxAttendeesShown": 999,
    "includeEmojis": {
      "videoCall": "🎥",
      "phoneCall": "☎️",
      "inPerson": "👥",
      "unknown": "📅"
    }
  }
}
```