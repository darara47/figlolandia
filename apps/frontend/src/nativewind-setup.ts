import { cssInterop } from 'nativewind';
import { Text, TextInput, View, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg from 'react-native-svg';

cssInterop(Text, { className: 'style' });
cssInterop(TextInput, { className: 'style' });
cssInterop(View, { className: 'style' });
cssInterop(Pressable, { className: 'style' });
cssInterop(ScrollView, { className: 'style', contentContainerClassName: 'contentContainerStyle' });
cssInterop(LinearGradient, { className: 'style' });
cssInterop(Svg, { className: 'style' });
