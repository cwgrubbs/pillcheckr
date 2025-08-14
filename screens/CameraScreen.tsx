import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Button, Image } from 'react-native';
import {StackNavigationProp} from "@react-navigation/stack";
import {RootStackParamList} from "../types";
import {
    CameraType,
    CameraView,
    useCameraPermissions,
} from "expo-camera";

type CameraScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CameraScreen'>;

interface CameraScreenProps {
    navigation: CameraScreenNavigationProp;
}
export default function CameraScreen({ navigation }: CameraScreenProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [facing, setFacing] = useState<CameraType>("back");
    const cameraRef = useRef<CameraView>(null);
    const [uri, setUri] = useState<string | null>(null);

    const takePicture = async () => {
        const photo = await cameraRef.current?.takePictureAsync();
        setUri(photo?.uri as string | null);
        if (photo) {
            navigation.navigate('ResultsScreen', { imageUri: photo.uri });
        } else {
            // Handle the case where photo is undefined
            console.error("Failed to take picture");
        }
    };

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: "center" }}>
                    We need your permission to use the camera
                </Text>
                <Button onPress={requestPermission} title="Grant permission" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {uri ? (
                <View style={styles.previewContainer}>
                    <Image source={{ uri: uri }} style={styles.previewImage} />
                    <Button title="Retake" onPress={() => setUri(null)} />
                    <Button title="Analyze" onPress={() => navigation.navigate('ResultsScreen', { imageUri: uri })} />
                </View>
            ) : (
                <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => {
                                setFacing(facing === "back" ? "front" : "back");
                            }}>
                            <Text style={styles.text}> Flip Camera </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.button} onPress={takePicture}>
                            <Text style={styles.text}> Capture </Text>
                        </TouchableOpacity>
                    </View>
                </CameraView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    camera: {
        flex: 1,
    },
    buttonContainer: {
        flex: 1,
        backgroundColor: 'transparent',
        flexDirection: 'row',
        margin: 20,
        justifyContent: 'space-around',
        alignItems: 'flex-end',
    },
    button: {
        flex: 0.3,
        alignSelf: 'flex-end',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 10,
        borderRadius: 5,
    },
    text: {
        fontSize: 18,
        basicColor: 'white',
    },
    previewContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewImage: {
        width: '90%',
        height: '70%',
        resizeMode: 'contain',
    },
});