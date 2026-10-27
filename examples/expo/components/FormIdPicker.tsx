import { StyleSheet, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Text } from '@/components/Themed';

type FormIdPickerProps = {
  disabled?: boolean;
  formIds: readonly string[];
  value: string;
  onChange: (formId: string) => void;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
  /** Shown when the manual text field is empty. */
  emptyHint?: string;
  /** Label for the manual input when env ids exist. */
  manualLabel?: string;
};

export function FormIdPicker({
  disabled = false,
  formIds,
  value,
  onChange,
  textColor,
  borderColor,
  placeholderColor,
  emptyHint = 'Enter feedback configuration ID',
  manualLabel = 'Feedback configuration ID',
}: FormIdPickerProps) {
  return (
    <>
      {formIds.length > 1 ? (
        <>
          <Text style={[styles.hint, { color: placeholderColor }]}>
            Choose a saved ID or enter another below
          </Text>
          <View style={[styles.pickerWrap, { borderColor }]}>
            <Picker
              accessibilityLabel="Saved form IDs"
              enabled={!disabled}
              selectedValue={value}
              onValueChange={(itemValue) => onChange(String(itemValue))}
              style={[styles.picker, { color: textColor }]}
              dropdownIconColor={textColor}>
              {!formIds.includes(value) && <Picker.Item label={value || "Choose a form ID"} value={value} />}
              {formIds.map((id) => (
                <Picker.Item key={id} label={id} value={id} />
              ))}
            </Picker>
          </View>
        </>
      ) : formIds.length === 0 ? (
        <Text style={[styles.hint, { color: placeholderColor }]}>{emptyHint}</Text>
      ) : null}

      <Text style={[styles.manualLabel, { color: placeholderColor }]}>{manualLabel}</Text>
      <TextInput
        style={[styles.input, { color: textColor, borderColor }]}
        placeholder="Feedback configuration ID"
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={onChange}
        accessibilityLabel={manualLabel}
        editable={!disabled}
        autoComplete="off"
        importantForAutofill="no"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: 12,
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  manualLabel: {
    fontSize: 12,
    marginBottom: 8,
    alignSelf: 'stretch',
    fontWeight: '600',
  },
  input: {
    minHeight: 50,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    width: '100%',
  },
  pickerWrap: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    width: '100%',
  },
  picker: {
    width: '100%',
  },
});
