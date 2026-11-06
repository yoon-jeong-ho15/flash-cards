import { Text, TextInput } from './Typography';
import React, { createContext, useContext, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon, type IconName } from "./Icon";
import { radius, useUI } from "./theme";
export { colors, s, useUI } from "./theme";
export function Button({
  title,
  onPress,
  tone = "primary",
  disabled = false,
  busy = false,
  icon,
  iconPosition = "start",
}: {
  title: string;
  onPress: () => void;
  tone?: "primary" | "secondary" | "danger" | "success";
  disabled?: boolean;
  busy?: boolean;
  icon?: IconName;
  iconPosition?: "start" | "end";
}) {
  const { colors, s } = useUI();
  const isPrimaryOrSuccess = tone === "primary" || tone === "success";
  const fgColor = isPrimaryOrSuccess
    ? colors.onPrimary
    : tone === "danger"
      ? colors.red
      : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: tone === "secondary" ? colors.input : "transparent",
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled || busy ? 0.45 : pressed ? 0.8 : 1,
        boxShadow: tone === "danger" ? undefined : `0px 1px 2px ${colors.shadow}`,
        backgroundColor:
          tone === "primary"
            ? colors.primary
            : tone === "success"
              ? colors.success
              : tone === "danger"
                ? colors.dangerBg
                : pressed ? colors.subtle : colors.card,
      })}
    >
      {busy ? (
        <ActivityIndicator color={fgColor} />
      ) : (
        <>
          {icon && iconPosition === "start" && (
            <Icon
              name={icon}
              size={17}
              color={fgColor}
            />
          )}
          <Text
            style={{
              flexShrink: 1,
              color: fgColor,
              fontWeight: "600",
              fontSize: 14,
              textAlign: "center",
            }}
          >
            {title}
          </Text>
          {icon && iconPosition === "end" && (
            <Icon
              name={icon}
              size={17}
              color={fgColor}
            />
          )}
        </>
      )}
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { colors, s } = useUI();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 7 }}>
      <Text style={[s.label, { color: colors.ink }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        accessibilityLabel={label}
        {...props}
        onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
        style={[
          s.input,
          props.multiline && { minHeight: 80, textAlignVertical: "top" },
          props.style,
          focused && { borderColor: colors.primary, boxShadow: `0px 0px 0px 3px ${colors.ring}` },
        ]}
      />
    </View>
  );
}
export function Chips<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
}) {
  const { colors, s } = useUI();
  return (
    <View style={[s.row, { gap: 4, padding: 4, borderRadius: radius.control + 4, backgroundColor: colors.subtle, alignSelf: "flex-start" }]}>
      {options.map(([key, label]) => (
        <Pressable
          key={key}
          accessibilityRole="button"
          accessibilityState={{ selected: value === key }}
          onPress={() => onChange(key)}
          style={({ pressed }) => ({
            minHeight: 44,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: radius.control,
            backgroundColor: key === value ? colors.card : "transparent",
            borderWidth: 1,
            borderColor: key === value ? colors.border : "transparent",
            boxShadow: key === value ? `0px 1px 2px ${colors.shadow}` : undefined,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: key === value ? colors.primary : colors.muted,
            }}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
}) {
  const { colors, s } = useUI();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${options.find(([key]) => key === value)?.[1]}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={[
          s.input,
          {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          },
        ]}
      >
        <Text style={[s.muted, { color: colors.ink, flexShrink: 1 }]}>
          {options.find(([key]) => key === value)?.[1]}
        </Text>
        <Icon name="chevron-down" size={16} color={colors.icon} />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "#09090B66",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="선택 닫기"
            onPress={() => setOpen(false)}
            style={{ flex: 1 }}
          />
          <SafeAreaView
            edges={["bottom"]}
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: radius.sheet,
              borderTopRightRadius: radius.sheet,
              padding: 20,
              gap: 8,
            }}
          >
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.input, alignSelf: "center", marginBottom: 12 }} />
            <Text style={[s.h2, { marginBottom: 12 }]}>{label}</Text>
            {options.map(([key, title]) => (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityState={{ checked: key === value }}
                onPress={() => {
                  onChange(key);
                  setOpen(false);
                }}
                style={{
                  padding: 14,
                  borderRadius: 10,
                  backgroundColor: key === value ? colors.pale : colors.card,
                }}
              >
                <View
                  style={[
                    s.row,
                    { flexWrap: "nowrap", justifyContent: "space-between" },
                  ]}
                >
                  <Text
                    style={[
                      s.text,
                      {
                        flex: 1,
                        color: key === value ? colors.primary : colors.ink,
                      },
                    ]}
                  >
                    {title}
                  </Text>
                  {key === value && <Icon name="check" size={18} color={colors.primary} />}
                </View>
              </Pressable>
            ))}
            <Button
              title="닫기"
              tone="secondary"
              onPress={() => setOpen(false)}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}
export function Progress({
  learned,
  total,
  compact = false,
}: {
  learned: number;
  total: number;
  compact?: boolean;
}) {
  const { colors, s } = useUI();
  const percent = total
    ? Math.min(100, Math.max(0, Math.round((learned / total) * 100)))
    : 0;
  return (
    <View style={{ gap: 8 }}>
      {!compact && (
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={s.muted}>
            {learned} / {total}장 학습
          </Text>
          <Text style={[s.label, { color: colors.primary }]}>{percent}%</Text>
        </View>
      )}
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: total || 1,
          now: learned,
          text: `${percent}%`,
        }}
        style={{
          height: 4,
          borderRadius: 4,
          backgroundColor: colors.track,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: 4,
            borderRadius: 4,
            width: `${percent}%`,
            backgroundColor: colors.primary,
          }}
        />
      </View>
    </View>
  );
}
export function ProgressRing({ percent }: { percent: number }) {
  const { colors, s } = useUI();
  return (
    <View
      accessible
      accessibilityLabel={`전체 달성률 ${percent}%`}
      style={{
        width: 80,
        height: 80,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {Array.from({ length: 100 }, (_, i) => {
        const angle = (i * Math.PI) / 50 - Math.PI / 2;
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: 39 + Math.cos(angle) * 36.5,
              top: 36.5 + Math.sin(angle) * 36.5,
              width: 2.5,
              height: 7,
              backgroundColor: i < percent ? colors.primary : colors.track,
              transform: [{ rotate: `${i * 3.6}deg` }],
            }}
          />
        );
      })}
      <Text style={s.h2}>
        {percent}
        <Text style={s.muted}>%</Text>
      </Text>
    </View>
  );
}
export function Empty({
  title = "아직 자료가 없어요",
  detail = "새로운 학습 자료를 추가해 보세요.",
}: {
  title?: string;
  detail?: string;
}) {
  const { colors, s } = useUI();
  return (
    <View
      style={[s.box, { paddingVertical: 24, alignItems: "center", gap: 10, borderStyle: "dashed", boxShadow: undefined }]}
    >
      <View
        style={{
          width: 40,
          height: 40,
          backgroundColor: colors.iconBg,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 4,
        }}
      ><Icon name="layers" size={22} /></View>
      <Text style={[s.h2, { textAlign: "center" }]}>{title}</Text>
      <Text style={[s.muted, { textAlign: "center" }]}>{detail}</Text>
    </View>
  );
}
export function Sheet({
  title,
  children,
  onClose,
  scrollable = true,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  scrollable?: boolean;
  footer?: React.ReactNode;
}) {
  const { colors, s } = useUI();
  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderColor: colors.border,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: colors.card,
          }}
        >
          <Text style={[s.h2, { flex: 1 }]}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose}
            style={({ pressed }) => ({ minWidth: 44, minHeight: 44, borderRadius: radius.control, backgroundColor: pressed ? colors.subtle : colors.card, alignItems: "center", justifyContent: "center" })}>
            <Icon name="close" size={20} color={colors.icon} />
          </Pressable>
        </View>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {scrollable ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.page}
            >
              {children}
            </ScrollView>
          ) : <View style={{ flex: 1 }}>{children}</View>}
          {footer && <View style={s.dock}>{footer}</View>}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
export const showError = (error: unknown) =>
  Alert.alert(
    "작업을 완료하지 못했어요",
    error instanceof Error ? error.message : String(error),
  );
export async function attempt(action: () => Promise<unknown>) {
  try {
    await action();
  } catch (error) {
    showError(error);
  }
}
export const confirm = (
  title: string,
  detail: string,
  action: () => Promise<unknown>,
) =>
  Alert.alert(title, detail, [
    { text: "취소", style: "cancel" },
    {
      text: "확인",
      style: "destructive",
      onPress: () => {
        void attempt(action);
      },
    },
  ]);
const ImageContext = createContext<(url: string) => void>(() => {});
export const useImage = () => useContext(ImageContext);
export function ImageProvider({ children }: { children: React.ReactNode }) {
  const { colors, s } = useUI();
  const [url, setURL] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  return (
    <ImageContext.Provider
      value={(value) => {
        if (/^(https:\/\/|data:image\/)/i.test(value)) {
          setURL(value);
          setZoom(1);
        }
      }}
    >
      {children}
      {url && (
        <Modal animationType="fade" onRequestClose={() => setURL(null)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: "#09090B" }}>
            <View style={[s.row, { padding: 16, justifyContent: "flex-end" }]}>
              <Button
                title="축소"
                disabled={zoom <= 1}
                tone="secondary"
                onPress={() => setZoom(Math.max(1, zoom - 0.5))}
              />
              <Button
                title="확대"
                disabled={zoom >= 3}
                tone="secondary"
                onPress={() => setZoom(Math.min(3, zoom + 0.5))}
              />
              <Button title="닫기" onPress={() => setURL(null)} />
            </View>
            <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
              <ScrollView
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Image
                  accessibilityLabel="첨부 이미지 확대 보기"
                  source={{ uri: url }}
                  resizeMode="contain"
                  style={{ width: 360 * zoom, height: 580 * zoom }}
                />
              </ScrollView>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </ImageContext.Provider>
  );
}
export function Attachment({ url }: { url?: string }) {
  const open = useImage();
  return url ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="첨부 이미지 확대"
      onPress={() => open(url)}
    >
      <Image
        source={{ uri: url }}
        accessibilityLabel="첨부 이미지"
        resizeMode="contain"
        style={{ height: 180, width: "100%", borderRadius: 12 }}
      />
    </Pressable>
  ) : null;
}
