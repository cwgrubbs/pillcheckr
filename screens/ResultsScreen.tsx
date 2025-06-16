import React, {useEffect, useState} from 'react';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import {ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, View} from 'react-native';
import {ResultsScreenProps} from "../types";
import {getPalette} from "@somesoap/react-native-image-palette";
import {GetColorName} from 'hex-color-to-color-name';
import ColorBox from "../components/ColorBox";
import {AdaptiveThresholdTypes, ColorConversionCodes, OpenCV, ThresholdTypes} from 'react-native-fast-opencv'; // Import react-native-fast-opencv
import * as FileSystem from 'expo-file-system'; // Needed for saving processed images
import RNFS from 'react-native-fs';

type Pill = {
    id: string;
    imprint: string;
    color: string;
    shape: string;
    name: string;
    description: string;
};

// Dummy data for pill identification (replace with real database lookup)
const dummyPills = [
    {
        id: '1', imprint: 'M 367', color: 'White', shape: 'Round', name: 'Acetaminophen 500mg',
        description: 'Pain reliever'
    },
    {
        id: '2', imprint: 'WATSON 349', color: 'White', shape: 'Oval', name: 'Hydrocodone/Acetaminophen',
        description: 'Opioid pain medication'
    },
    {
        id: '3', imprint: 'XANAX 0.5', color: 'Peach', shape: 'Oval', name: 'Alprazolam 0.5mg',
        description: 'Anxiety medication'
    },
    {id: '4', imprint: 'IBUPROFEN', color: 'Orange', shape: 'Round', name: 'Ibuprofen 200mg', description: 'NSAID'},
];

const ResultsScreen: React.FC<ResultsScreenProps> = ({navigation, route}) => {
    const {imageUri} = route.params;
    const [isLoading, setIsLoading] = useState(true);
    const [extractedFeatures, setExtractedFeatures] = useState({
        imprint: 'Analyzing...',
        color: 'Analyzing...',
        shape: 'Analyzing...',
    });
    const [matchedPills, setMatchedPills] = useState<Pill[]>([]);
    const [processedImageUri, setProcessedImageUri] = useState<string | null>(null); // State for the processed image URI

    const convertImageToBase64 = async (imageUri: string) => {
        try {
            return await RNFS.readFile(imageUri, 'base64');
        } catch (error) {
            console.error('Error converting image to base64:', error);
            return null;
        }
    };

    // Function to perform image pre-processing using react-native-fast-opencv's invoke
    const preprocessImage = async (uri: string): Promise<string | undefined> => {
        try {
            // Ensure the URI is a file path if it's content:// or data:
            let localUri = uri;
            if (Platform.OS === 'android' && uri.startsWith('content://')) {
                // On Android, content URIs need to be resolved to file paths
                // This is a simplified approach; a more robust solution might use RNFS.
                const fileName = `${FileSystem.cacheDirectory}temp_image_${Date.now()}.jpg`;
                await FileSystem.copyAsync({
                    from: uri,
                    to: fileName,
                });
                localUri = fileName;
            } else if (uri.startsWith('data:')) {
                // Convert data URI to a temporary file
                const base64Data = uri.split(',')[1];
                // Determine format from URI or default to png if not clear
                const format = uri.match(/data:image\/(.+);base64/)?.[1] || 'png';
                const fileName = `${FileSystem.cacheDirectory}temp_image_${Date.now()}.${format}`;
                await FileSystem.writeAsStringAsync(fileName, base64Data, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                localUri = fileName;
            }

            const outputFileName = `${FileSystem.cacheDirectory}processed_pill_${Date.now()}.png`;

            // Invoke the sequence of operations
            const processedUri = convertImageToBase64(imageUri)
                .then((base64String) => {
                    if (base64String) {
                        console.log('Base64 string:', base64String);
                        return OpenCV.base64ToMat(base64String);
                    }
                })
                .then((srcMat) => {
                    if (srcMat) {

                        OpenCV.invoke("cvtColor", srcMat, srcMat, ColorConversionCodes.COLOR_BGR2GRAY);
                        OpenCV.invoke("adaptiveThreshold", srcMat, srcMat, 255, AdaptiveThresholdTypes.ADAPTIVE_THRESH_MEAN_C,
                            ThresholdTypes.THRESH_BINARY, 11, 1);
                        OpenCV.invoke("medianBlur", srcMat, srcMat, 11);
                        OpenCV.invoke("bitwise_not", srcMat, srcMat);

                        const result = OpenCV.toJSValue(srcMat);
                        RNFS.writeFile(outputFileName, result.base64, 'base64');

                        OpenCV.clearBuffers();

                        return outputFileName.toString();
                    }
                })
                .catch((error) => {
                    console.error(error);
                    return "lol wtf";
                });

            console.log("Processed URI from invoke:", processedUri);

            return processedUri;

        } catch (error) {
            console.error("Error during image pre-processing with fast-opencv invoke:", error);
            // Fallback to original image if pre-processing fails
            return uri;
        }
    };


    useEffect(() => {
        const analyzeImage = async () => {
            setIsLoading(true);
            let uriForOCR = imageUri; // Will be updated to processed URI

            try {
                // Pre-process the image using the new invoke-based function
                let processedUri = await preprocessImage(imageUri);

                processedUri = processedUri ? processedUri : "aids";

                setProcessedImageUri(processedUri); // Store processed URI for display
                uriForOCR = processedUri; // Use the processed URI for OCR and potentially shape

                // dominant color (using original image, as processing changes color)
                const dominantColor = await getPalette(imageUri).then(palette => palette.vibrant);
                setExtractedFeatures(prev => ({...prev, color: dominantColor}));

                // --- 2. Extract Imprint ---
                // OCR using the PROCESSED image URI
                let detectedImprintResult = await TextRecognition.recognize(imageUri);
                if(detectedImprintResult.text.length === 0) {
                    detectedImprintResult = await TextRecognition.recognize(uriForOCR);
                }
                setExtractedFeatures(prev => ({...prev, imprint: detectedImprintResult.text}));

                // --- 3. Extract Shape ---
                // For shape, you might also want to use a processed image (like the bitwiseNotUri)
                // if your shape detection algorithm relies on binary images or contours.
                // Or you could use the original if your shape detection is color/grayscale-based.
                const detectedShape = await detectShape(uriForOCR); // Pass processed URI for shape detection
                setExtractedFeatures(prev => ({...prev, shape: detectedShape}));

                // --- 4. Match with Dummy Database ---
                const matched = dummyPills.filter(pill =>
                        (detectedImprintResult.text.toLowerCase().includes(pill.imprint.toLowerCase())
                            || pill.imprint.toLowerCase().includes(detectedImprintResult.text.toLowerCase()))
                        && (dominantColor.toLowerCase().includes(pill.color.toLowerCase())
                            || pill.color.toLowerCase().includes(dominantColor.toLowerCase()))
                    // Add shape matching here if your `detectShape` is robust
                );
                setMatchedPills(matched);

            } catch (error) {
                console.error("Error analyzing image:", error);
                setExtractedFeatures({imprint: 'Error', color: 'Error', shape: 'Error'});
                setMatchedPills([]);
            } finally {
                setIsLoading(false);
            }
        };

        analyzeImage();
    }, [imageUri]);

    // Placeholder for a simple shape detection (replace with real computer vision logic)
    // You could use opencv.findContours here if needed, but it would be a separate call
    // not part of the 'invoke' chain as 'invoke' returns the final image, not intermediate contour data.
    const detectShape = async (uri: string) => {
        // Example of how you might use findContours separately:
        // try {
        //     const { contours, hierarchy } = await opencv.findContours(uri, opencv.RETR_TREE, opencv.CHAIN_APPROX_NONE);
        //     console.log("Detected contours:", contours.length);
        //     // Process contours to determine shape (e.g., check aspect ratio, number of vertices)
        //     // For example: if contours.length > X and contour[0].length is approx circle...
        // } catch (e) {
        //     console.error("Error finding contours:", e);
        // }

        if (uri.includes('sample_pill_oval')) return 'Oval';
        if (uri.includes('sample_pill_round')) return 'Round';
        await new Promise(resolve => setTimeout(resolve, 1000));
        return 'Unknown';
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Analysis Results</Text>
            {/* Display the ORIGINAL image */}
            {imageUri && (
                <View>
                    <Text style={styles.imageLabel}>Original Image:</Text>
                    <Image source={{uri: imageUri}} style={styles.image}/>
                </View>
            )}
            {/* Display the PROCESSED image for debugging/comparison */}
            {processedImageUri && processedImageUri !== imageUri && (
                <View>
                    <Text style={styles.imageLabel}>Processed Image (for OCR):</Text>
                    <Image source={{uri: processedImageUri}} style={styles.image}/>
                </View>
            )}


            {isLoading ? (
                <ActivityIndicator size="large" color="#0000ff" style={styles.loadingIndicator}/>
            ) : (
                <View style={styles.featuresContainer}>
                    <Text style={styles.featureLabel}>Extracted Features:</Text>
                    <Text style={styles.featureText}>Imprint: {extractedFeatures.imprint}</Text>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                        <Text style={styles.featureText}>
                            Dominant
                            Color: {GetColorName(extractedFeatures.color) + " (" + extractedFeatures.color + ")"}
                        </Text>
                        <ColorBox color={extractedFeatures.color}/>
                    </View>
                    <Text style={styles.featureText}>Shape: {extractedFeatures.shape}</Text>

                    <Text style={styles.matchTitle}>Potential Matches:</Text>
                    {matchedPills.length > 0 ? (
                        matchedPills.map(pill => (
                            <View key={pill.id} style={styles.pillCard}>
                                <Text style={styles.pillName}>{pill.name}</Text>
                                <Text>Imprint: {pill.imprint}</Text>
                                <Text>Color: {pill.color}</Text>
                                <Text>Shape: {pill.shape}</Text>
                                <Text>Description: {pill.description}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.noMatchText}>No direct matches found based on extracted features. Try a
                            clearer photo or adjust lighting.</Text>
                    )}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    image: {
        width: '100%',
        height: 300,
        resizeMode: 'contain',
        marginBottom: 20,
        borderRadius: 10,
        backgroundColor: '#eee',
    },
    imageLabel: { // New style for image labels
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
        marginTop: 10,
    },
    loadingIndicator: {
        marginTop: 50,
    },
    featuresContainer: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 20,
    },
    featureLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    featureText: {
        fontSize: 16,
        marginBottom: 5,
    },
    matchTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 15,
    },
    pillCard: {
        backgroundColor: '#e6f7ff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#b3e0ff',
    },
    pillName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#0056b3',
    },
    noMatchText: {
        fontStyle: 'italic',
        color: '#555',
    },
});

export default ResultsScreen;