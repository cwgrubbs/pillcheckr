import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;

interface HomeScreenProps {
    navigation: HomeScreenNavigationProp;
}
export default function HomeScreen({ navigation }: HomeScreenProps) {
    const pickImage = async (source: string) => {
        let result;
        if (source === 'camera') {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                alert('Sorry, we need camera roll permissions to make this work!');
                return;
            }
            result = await ImagePicker.launchCameraAsync({
                mediaTypes: 'images',
                allowsEditing: true, // Allow basic cropping if needed
                aspect: [4, 3],
                quality: 1,
            });
        } else { // 'gallery'
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                alert('Sorry, we need camera roll permissions to make this work!');
                return;
            }
            result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                aspect: [4, 3],
                quality: 1,
            });
        }

        if (!result.canceled) {
            navigation.navigate('ResultsScreen', { imageUri: result.assets[0].uri });
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Pill Identifier</Text>
            <Button title="Take Photo" onPress={() => pickImage('camera')} />
            <Button title="Choose from Gallery" onPress={() => pickImage('gallery')} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        marginBottom: 20,
    },
});