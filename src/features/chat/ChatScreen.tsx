import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { useNetworkStatus } from '../../shared/net/useNetworkStatus';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { Screen } from '../../shared/ui/Screen';
import { Text } from '../../shared/ui/Text';
import { useTabBarClearance } from '../../shared/ui/tabBarLayout';
import { ChatHeader } from './components/ChatHeader';
import { ChatWallpaper } from './components/ChatWallpaper';
import { Composer } from './components/Composer';
import { MessageList } from './components/MessageList';
import { SuggestionChips } from './components/SuggestionChips';
import { describeChatError, useChat } from './useChat';
import { useKeyboardVisible } from './useKeyboardVisible';

/**
 * AgroMet AI — the assistant, on the tab Library used to hold.
 *
 * Library was one card of four FAQ answers, and its own docblock recorded that
 * four of the five things it once promised had been settled elsewhere. The
 * backend has been serving `/api/chat` all along with nothing in this app
 * calling it; a conversation is a better use of the slot than a static list, and
 * the FAQ answers themselves are kept for the Mobile Menu (see
 * `features/library/useFaqs.ts`).
 *
 * The screen is built in the messaging idiom rather than the app's page idiom: a
 * contact header, a wallpapered transcript, and a composer, bracketed top and
 * bottom by `chrome` so the conversation reads as a place rather than a page.
 * Every colour, radius and space still comes from the theme — see the bubble
 * tokens added to `theme/tokens.ts` — so it is a different arrangement of this
 * app's design system, not a second one.
 *
 * Layout notes, because this is the app's first screen with a pinned input:
 *
 *   - `scroll={false} padded={false} fullBleed` — the transcript owns its
 *     scrolling and the header owns the top inset, so per `Screen`'s contract
 *     this screen owes itself its insets *and* its tab-bar clearance.
 *   - On Android `behavior` is left undefined. `app.json` sets no
 *     `softwareKeyboardLayoutMode`, so Expo's default `resize` applies and the
 *     window already shrinks; adding `height` or `padding` on top of that
 *     double-compensates and leaves a dead band above the keys.
 *   - The clearance collapses while the keyboard is up. The floating tab bar is
 *     behind the keyboard at that point, so holding its ~90dp of room open puts
 *     a visible gap between the composer and the keys.
 */
export function ChatScreen() {
  const theme = useTheme();
  const { isOnline } = useNetworkStatus();
  const keyboardVisible = useKeyboardVisible();
  const tabBarClearance = useTabBarClearance();
  const { messages, isSending, error, send, retry, region } = useChat();

  const hasTranscript = messages.length > 0;
  const errorMessage = error ? describeChatError(error) : undefined;

  return (
    <Screen scroll={false} padded={false} fullBleed>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ChatHeader isSending={isSending} isOnline={isOnline} />

        {/* The wallpapered ground. It is scoped to the transcript rather than
            painted behind the whole screen so the header and composer stay flat
            chrome — the pattern marks where the conversation lives. */}
        <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
          <ChatWallpaper />

          {hasTranscript ? (
            <MessageList
              messages={messages}
              isSending={isSending}
              errorMessage={errorMessage}
              onRetry={retry}
            />
          ) : (
            // Before the first question there is nothing to scroll, but the
            // starters must still clear the keyboard on a short screen.
            <ScrollView
              contentContainerStyle={{
                padding: theme.spacing.md,
                gap: theme.spacing.md,
                flexGrow: 1,
                justifyContent: 'flex-end',
              }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Reads as the assistant's opening turn — an incoming bubble,
                  not a card of instructions above the conversation. */}
              <View
                style={{
                  alignSelf: 'flex-start',
                  maxWidth: '84%',
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: 10,
                  borderTopLeftRadius: 0,
                  backgroundColor: theme.colors.bubbleIn,
                }}
              >
                <Text variant="body">
                  Ask me about planting, weather, pests or prices. I know Ghana&apos;s
                  seasons, but not your farm — tell me your crop and district and I
                  can be specific.
                </Text>
              </View>

              <SuggestionChips onSelect={send} disabled={isSending || !isOnline} />
            </ScrollView>
          )}
        </View>

        <View
          style={{
            backgroundColor: theme.colors.chrome,
            paddingHorizontal: theme.spacing.sm,
            paddingTop: theme.spacing.sm,
            paddingBottom: keyboardVisible ? theme.spacing.sm : tabBarClearance,
          }}
        >
          <Composer
            onSend={send}
            isSending={isSending}
            isOnline={isOnline}
            region={region}
            // Camera and Photos lead here rather than attaching a file:
            // /api/chat takes text only, and Crop Diagnose is where a crop
            // photo actually gets looked at.
            onOpenDiagnose={() => router.push('/diagnose')}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
