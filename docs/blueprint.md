# Daily Schedule Reminder Bot — Bot specification

**Archetype:** workflow

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

A Telegram bot that accepts a structured daily schedule from an owner, validates posting permissions to a specified resources channel, and automatically sends timely reminders with topics and timestamps. Supports schedule updates and error notifications via DMs while maintaining persistent storage of configurations and logs.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- single owner
- small team

## Success criteria

- Daily reminders posted to resources channel at scheduled times
- Owner receives DM notifications for setup confirmation and posting failures
- Schedule updates are processed and applied to future reminders

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open main menu for initial setup or status checks
- **/update_schedule** (command, actor: user, command: /update_schedule) — Submit a revised schedule document for processing
- **/status** (command, actor: user, command: /status) — View persistent logs of sent reminders and failures

## Flows

### onboarding
_Trigger:_ /start

1. Request resources channel identifier
2. Request daily schedule document
3. Validate channel posting permissions
4. Confirm setup completion

_Data touched:_ owner_config, schedule_entries

### schedule_update
_Trigger:_ /update_schedule

1. Request new schedule document
2. Validate structure and times
3. Replace existing schedule entries

_Data touched:_ schedule_entries

### daily_reminder
_Trigger:_ cron:scheduled_time

1. Fetch schedule entries for current time
2. Format reminder message with timestamp
3. Post to resources channel

_Data touched:_ schedule_entries, reminders

### failure_notification
_Trigger:_ post_failure

1. Log failure details
2. Send error DM to owner with timestamp and reason

_Data touched:_ logs

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **owner_config** _(retention: persistent)_ — Owner's Telegram ID and resources channel configuration
  - fields: owner_user_id, channel_id, timezone
- **schedule_entries** _(retention: persistent)_ — Recurring or one-time reminder schedule with topics
  - fields: days, time, message_text, is_recurring
- **reminders** _(retention: persistent)_ — Sent reminder records with timestamps
  - fields: scheduled_time, actual_post_time, message_text, status
- **logs** _(retention: persistent)_ — Error and operational logs for troubleshooting
  - fields: timestamp, event_type, description

## Integrations

- **Telegram** (required) — Bot API messaging and channel posting
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Provide/replace schedule document
- Specify resources channel
- Configure notification preferences (error-only vs all reminders)
- View status logs via /status command

## Notifications

- Direct message to owner on setup success
- Direct message notifications for posting failures
- Optional direct message copies of each reminder

## Permissions & privacy

- Bot requires posting permissions in the resources channel
- Only stores necessary data for operation (no third-party sharing)
- Owner can delete all stored data by removing the bot

## Edge cases

- Invalid or unparseable schedule formats
- Channel access permissions revoked after setup
- Timezone mismatches between owner and bot

## Required tests

- End-to-end test of daily reminder posting flow
- Error handling when channel posting fails
- Schedule update validation and replacement logic

## Assumptions

- Owner will provide structured schedule input
- Owner will grant necessary channel permissions during setup
- Basic recurrence patterns (daily/weekdays) cover most use cases
