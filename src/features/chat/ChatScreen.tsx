import React, { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { useNetworkStatus } from '../../shared/net/useNetworkStatus';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { DoodleWallpaper } from '../../shared/ui/DoodleWallpaper';
import { Screen } from '../../shared/ui/Screen';
import { Text } from '../../shared/ui/Text';
import { useTabBarClearance } from '../../shared/ui/tabBarLayout';
import { ChatHeader } from './components/ChatHeader';
import { Composer } from './components/Composer';
import * as ImagePicker from 'expo-image-picker';

import { useReadAloud } from '../../shared/speech/useReadAloud';
import { compressImage } from '../../shared/utils/compressImage';
import { MessageBubble } from './components/MessageBubble';
import { MessageList } from './components/MessageList';
import { SuggestionChips } from './components/SuggestionChips';
import { CHAT_GREETING } from './starterPrompts';
import { useChat } from './useChat';
import { useKeyboardVisible } from './useKeyboardVisible';
import { useSlowReply } from './useSlowReply';

/**
 * AgroMet AI — the assistant, on the tab Library used to hold.
 *
 * Library was one card of four FAQ answers, and its own docblock recorded that
 * four of the five things it once promised had been settled elsewhere. The
 * backend has been serving `/api/chat` all along with nothing in this app
 * calling it; a conversation is a better use of the slot than a static list, and
 * the FAQ answers themselves are retained but unplaced (see
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
  const { messages, isSending, serverReachable, send, askPhoto, retry, clear, region, town } = useChat();
  const isSlow = useSlowReply(isSending);
  // Stable for the life of the screen: the greeting is not a message that was
  // sent at a moment, but the bubble it borrows shows a time, and a time that
  // ticked with every render would be the one clock in the app that moves.
  const greetedAt = useRef(new Date().toISOString());
  const readAloud = useReadAloud();
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);

  /**
   * Take or choose a photo and ask about it, without leaving the conversation.
   *
   * Permission is requested at the moment the farmer picks a source, which is
   * the app's established pattern: a prompt arriving with a reason attached is
   * granted far more often than one that interrupts.
   */
  const attachPhoto = useCallback(
    async (source: 'camera' | 'photos') => {
      setPhotoNotice(null);
      try {
        const permission =
          source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          setPhotoNotice(
            source === 'camera'
              ? 'Camera access is off. Turn it on in your device settings, or choose a photo instead.'
              : 'Photo access is off. Turn it on in your device settings, or take a photo instead.',
          );
          return;
        }

        const result =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
            : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });

        if (result.canceled || !result.assets?.[0]) return;

        // Compressed before it is read into memory or uploaded, same as the
        // Diagnose screen does.
        await askPhoto(await compressImage(result.assets[0].uri));
      } catch {
        setPhotoNotice('Could not open that photo. Try again, or type your question.');
      }
    },
    [askPhoto],
  );

  const hasTranscript = messages.length > 0;

  return (
    <Screen scroll={false} padded={false} fullBleed>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ChatHeader
          isSending={isSending}
          isOnline={isOnline}
          serverReachable={serverReachable}
          onClear={hasTranscript ? clear : undefined}
        />

        {/* The wallpapered ground — the same pattern Home paints, via Screen's
            `wallpaper` prop. Rendered directly here rather than through that
            prop because this screen scopes it to the transcript: the header and
            composer stay flat `chrome`, so chrome recedes and the conversation
            advances. */}
        <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
          <DoodleWallpaper />

          {hasTranscript ? (
            <MessageList
              messages={messages}
              isSending={isSending}
              onRetry={retry}
              onToggleSpeech={readAloud.isAvailable ? readAloud.toggle : undefined}
              speakingId={readAloud.speakingId}
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
              {/* The assistant's opening turn, rendered as one. This used to be
                  a hand-built View copying MessageBubble's fill, radius and
                  squared corner, which meant the bubble's geometry lived in two
                  files and the greeting was the copy that would fall behind. */}
              <MessageBubble
                message={{
                  id: 'greeting',
                  role: 'assistant',
                  text: CHAT_GREETING,
                  at: greetedAt.current,
                }}
                state="sent"
                isFirstInGroup
              />

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
          {/* The answer arrives whole, not word by word, so a long wait has
              nothing on screen but three dots. Past the point where those stop
              reading as thinking, say what is happening. */}
          {isSlow ? (
            <Text variant="caption" muted style={{ paddingHorizontal: theme.spacing.lg }}>
              Still working. This can take a moment on a slow connection.
            </Text>
          ) : null}

          {photoNotice ? (
            <Text variant="caption" color={theme.colors.warning} style={{ paddingHorizontal: theme.spacing.lg }}>
              {photoNotice}
            </Text>
          ) : null}

          <Composer
            onSend={send}
            isSending={isSending}
            isOnline={isOnline}
            region={region}
            town={town}
            // The grid's Diagnose tile: the full crop check, which keeps the
            // photo, numbers the actions and files the result. The camera in
            // the row attaches to the conversation instead.
            onOpenDiagnose={() => router.push('/diagnose')}
            onAttachPhoto={attachPhoto}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
