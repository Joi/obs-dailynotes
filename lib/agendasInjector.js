/**
 * Build agenda lines for a meeting event based on reminders cache and assistant exclusions.
 * - Respects a per-run set to avoid injecting the same person's agenda multiple times.
 *
 * @param {Object} event - Google Calendar event
 * @param {Object|null} remindersCache - Cache object with byPerson mapping
 * @param {Set<string>} agendasInjectedForPerson - Set tracking injected person keys for this run
 * @param {Set<string>} assistantEmails - Lowercased emails (or names) to exclude from agenda injection
 * @returns {string[]} lines to append under the meeting
 */
function buildAgendaLinesForEvent(event, remindersCache, agendasInjectedForPerson, assistantEmails) {
    if (!remindersCache || !remindersCache.byPerson || !Array.isArray(event.attendees)) {
        return [];
    }

    const attendeeNames = event.attendees.map(a => a.displayName || '').filter(Boolean);
    const attendeeEmails = event.attendees.map(a => String(a.email || '').toLowerCase()).filter(Boolean);
    const agendaLines = [];

    for (const [personKey, info] of Object.entries(remindersCache.byPerson)) {
        const aliasSet = new Set([info.name, ...(Array.isArray(info.aliases) ? info.aliases : [])]);
        const emailSet = new Set((Array.isArray(info.emails) ? info.emails : []).map(e => String(e || '').toLowerCase()));

        const matchedByEmail = attendeeEmails.some(e => emailSet.has(e));
        const matchedByName = attendeeNames.some(n => aliasSet.has(n));
        const matched = matchedByEmail || matchedByName;

        const isAssistant = attendeeEmails.some(e => assistantEmails.has(e)) || attendeeNames.some(n => assistantEmails.has(String(n || '').toLowerCase()));
        const skipAsAssistant = isAssistant;

        if (matched && !skipAsAssistant && !agendasInjectedForPerson.has(personKey) && Array.isArray(info.items) && info.items.length) {
            agendasInjectedForPerson.add(personKey);
            agendaLines.push(`\n- Agenda for [[${info.name}|${info.name}]]:`);
            for (const it of info.items.slice(0, 5)) {
                agendaLines.push(`  - [ ] ${it.title} (${it.list}) <!--reminders-id:${it.id} list:${it.list} person:${personKey}-->`);
            }
        }
    }

    return agendaLines;
}

module.exports = {
    buildAgendaLinesForEvent,
};


