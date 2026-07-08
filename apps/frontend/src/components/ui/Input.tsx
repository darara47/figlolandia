import { TextInput, TextInputProps, StyleSheet } from 'react-native';

interface InputProps extends TextInputProps {
  className?: string;
}

export const Input = ({ style, ...props }: InputProps) => {
  return (
    <TextInput
      style={[styles.input, style]}
      placeholderTextColor="#9CA3AF"
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },
});
