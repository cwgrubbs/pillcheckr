import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    Alert,
} from 'react-native';
import {
    Button,
    useTheme,
    MD3Theme,
    Appbar, // <-- New import for the Appbar component
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../types';
import GtLogo from '../components/GtLogo';

// Define the navigation prop type for TypeScript
type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;

interface HomeScreenProps {
    navigation: HomeScreenNavigationProp;
}

// Get the device screen width for responsive styling
const {width} = Dimensions.get('window');

// The main HomeScreen component
export default function HomeScreen({navigation}: HomeScreenProps) {
    const theme: MD3Theme = useTheme();

    const pickImage = async (source: 'camera' | 'gallery') => {
        let result;
        if (source === 'camera') {
            const {status} = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Sorry, we need camera permissions to make this work!');
                return;
            }
            result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 1,
            });
        } else { // 'gallery'
            const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Sorry, we need gallery permissions to make this work!');
                return;
            }
            result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 1,
            });
        }

        if (!result.canceled) {
            navigation.navigate('ResultsScreen', {imageUri: result.assets[0].uri});
        }
    };

    return (
        <View style={[styles.fullScreenContainer, {backgroundColor: theme.colors.background}]}>
            <Appbar.Header style={{backgroundColor: theme.colors.primary}}>
                <Appbar.Content title="Pill Identifier" titleStyle={{color: theme.colors.onPrimary}}/>
            </Appbar.Header>
            <ScrollView contentContainerStyle={styles.container}>

                {/* Button container with a cleaner layout */}
                <View style={styles.buttonContainer}>
                    {/* We now use the Material Design Button component */}
                    <Button
                        mode="contained"
                        onPress={() => pickImage('camera')}
                        style={styles.button}
                    >
                        Take Photo
                    </Button>
                    <Button
                        mode="contained"
                        onPress={() => pickImage('gallery')}
                        style={styles.button}
                    >
                        Choose from Gallery
                    </Button>
                    <Button
                        mode="outlined"
                        onPress={() => navigation.navigate('HomeScreen')}
                        style={styles.button}
                    >
                        Saved Pills
                    </Button>
                    <Button
                        mode="outlined"
                        onPress={() => navigation.navigate('HomeScreen')}
                        style={styles.button}
                    >
                        Support
                    </Button>
                </View>

                {/* Container for the logo with improved styling */}
                <View style={styles.logoContainer}>
                    <GtLogo height={width * 0.5} width={width * 0.5} fillColor={theme.colors.primary}/>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
    },
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    logoContainer: {
        marginBottom: 40,
        width: '100%',
        alignItems: 'center',
    },
    buttonContainer: {
        width: '80%',
        alignItems: 'stretch',
    },
    button: {
        marginBottom: 15,
    },
});
