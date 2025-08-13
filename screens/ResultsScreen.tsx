import React, {useEffect, useState} from 'react';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import {
    ActivityIndicator,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {Picker} from '@react-native-picker/picker'; // For dropdowns
import {ResultsScreenProps} from "../types";
import {getPalette} from "@somesoap/react-native-image-palette";
import {GetColorName} from 'hex-color-to-color-name';
import ColorBox from "../components/ColorBox";
import {AdaptiveThresholdTypes, ColorConversionCodes, OpenCV, ThresholdTypes} from 'react-native-fast-opencv'; // Import react-native-fast-opencv
import * as FileSystem from 'expo-file-system'; // Needed for saving processed images
import RNFS from 'react-native-fs';
import Dropdown from 'react-native-input-select';

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

    // --- New State for Manual Input ---
    const [manualImprint, setManualImprint] = useState('');
    const [manualColor, setManualColor] = useState<string>(''); // Initialize with an empty string
    const [manualShape, setManualShape] = useState<string>(''); // Initialize with an empty string

    // --- Define common pill colors and shapes ---
    const commonPillColors = [
        {label: 'Any', value: 'Any'},
        {label: 'White', value: 'White'},
        {label: 'Blue', value: 'Blue'},
        {label: 'Green', value: 'Green'},
        {label: 'Yellow', value: 'Yellow'},
        {label: 'Orange', value: 'Orange'},
        {label: 'Pink', value: 'Pink'},
        {label: 'Purple', value: 'Purple'},
        {label: 'Red', value: 'Red'},
        {label: 'Brown', value: 'Brown'},
        {label: 'Black', value: 'Black'},
        {label: 'Clear', value: 'Clear'}
    ];
    const allPillShapes = [
        {label: 'Any', value: 'Any'},
        {label: 'Round', value: 'Round'},
        {label: 'Oval', value: 'Oval'},
        {label: 'Capsule', value: 'Capsule'},
        {label: 'Oblong', value: 'Oblong'},
        {label: 'Diamond', value: 'Diamond'},
        {label: 'Rectangle', value: 'Rectangle'},
        {label: 'Triangle', value: 'Triangle'},
        {label: 'Pentagon', value: 'Pentagon'},
        {label: 'Hexagon', value: 'Hexagon'},
        {label: 'Octagon', value: 'Octagon'},
        {label: 'Tear', value: 'Tear'},
        {label: 'G', value: 'G'},
        {label: 'Barrel', value: 'Barrel'},
        {label: 'Heart', value: 'Heart'}
    ];

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


    // --- Modified analyzeImage to handle manual search ---
    useEffect(() => {
        // This useEffect will now only trigger the *initial* automated analysis
        // The manual search will be triggered by a separate function
        const initialAnalyze = async () => {
            setIsLoading(true);
            let uriForOCR = imageUri;

            try {
                // Perform automated pre-processing and feature extraction
                /*const processedUri = await preprocessImage(imageUri);

                if (processedUri) {
                    setProcessedImageUri(processedUri);
                    uriForOCR = processedUri;
                } else {
                    console.warn("Image pre-processing failed, using original image for OCR.");
                    setProcessedImageUri(imageUri);
                }*/

                console.warn("Image pre-processing failed, using original image for OCR.");
                setProcessedImageUri(imageUri);

                // Automated Color Detection (always from original image)
                const dominantColor = await getPalette(imageUri).then(palette => palette.vibrant);
                setExtractedFeatures(prev => ({...prev, color: dominantColor}));

                // Automated OCR
                const detectedImprintResult = await TextRecognition.recognize(uriForOCR);
                setExtractedFeatures(prev => ({...prev, imprint: detectedImprintResult.text}));

                // Automated Shape (placeholder, will use uriForOCR)
                const detectedShape = await detectShape(uriForOCR);
                setExtractedFeatures(prev => ({...prev, shape: detectedShape}));

                // Initial automated match
                matchPills(detectedImprintResult.text, dominantColor, detectedShape);

            } catch (error) {
                console.error("Error analyzing image:", error);
                setExtractedFeatures({imprint: 'Error', color: 'Error', shape: 'Error'});
                setMatchedPills([]);
            } finally {
                setIsLoading(false);
            }
        };

        initialAnalyze();
    }, [imageUri]); // Only re-run on imageUri change

    // --- New function for matching pills based on provided features ---
    const matchPills = (imprint: string, color: string, shape: string) => {
        const matched = dummyPills.filter(pill => {
            const imprintMatch = (imprint && (imprint.toLowerCase().includes(pill.imprint.toLowerCase())
                || pill.imprint.toLowerCase().includes(imprint.toLowerCase())));
            const colorMatch = (color === 'Any' || (color && (color.toLowerCase().includes(pill.color.toLowerCase())
                || pill.color.toLowerCase().includes(color.toLowerCase()))));
            const shapeMatch = (shape === 'Any' || (shape && (shape.toLowerCase().includes(pill.shape.toLowerCase())
                || pill.shape.toLowerCase().includes(shape.toLowerCase()))));

            return imprintMatch && colorMatch && shapeMatch;
        });
        setMatchedPills(matched);
    };

    // --- Manual Search Trigger ---
    const handleManualSearch = () => {
        setIsLoading(true); // Show loading while searching
        // Use manual inputs for matching
        matchPills(manualImprint, manualColor, manualShape);
        setIsLoading(false); // Hide loading after search
    };

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
            {/* ... (Original and Processed Image Display) ... */}
            {imageUri && (
                <View>
                    <Text style={styles.imageLabel}>Original Image:</Text>
                    <Image source={{uri: imageUri}} style={styles.image}/>
                </View>
            )}

            {/*
            {processedImageUri && processedImageUri !== imageUri && (
                <View>
                    <Text style={styles.imageLabel}>Processed Image (for OCR):</Text>
                    <Image source={{uri: processedImageUri}} style={styles.image}/>
                </View>
            )}
            */}

            {isLoading ? (
                <ActivityIndicator size="large" color="#0000ff" style={styles.loadingIndicator}/>
            ) : (
                <View style={styles.featuresContainer}>
                    <Text style={styles.featureLabel}>Extracted Features (Automated):</Text>
                    <Text style={styles.featureText}>Imprint: {extractedFeatures.imprint}</Text>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                        <Text style={styles.featureText}>
                            Dominant
                            Color: {GetColorName(extractedFeatures.color) + " (" + extractedFeatures.color + ")"}
                            <ColorBox color={extractedFeatures.color}/>
                        </Text>
                    </View>
                    <Text style={styles.featureText}>Shape: {extractedFeatures.shape}</Text>

                    {/* --- Manual Input Section --- */}
                    <View style={styles.manualInputContainer}>
                        <Text style={styles.manualInputTitle}>Manual Search</Text>

                        <Text style={styles.inputLabel}>Imprint Text:</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="e.g., M 367, IBUPROFEN"
                            value={manualImprint}
                            onChangeText={setManualImprint}
                        />

                        <Dropdown
                            label="Color:"
                            labelStyle={styles.inputLabel}
                            placeholder="Select an option..."
                            options={commonPillColors}
                            selectedValue={manualColor}
                            onValueChange={(itemValue: any) => setManualColor(itemValue)}
                        />

                        <Dropdown
                            label="Shape:"
                            labelStyle={styles.inputLabel}
                            placeholder="Select an option..."
                            options={allPillShapes}
                            selectedValue={manualShape}
                            onValueChange={(itemValue: any) => setManualShape(itemValue)}
                        />

                        <TouchableOpacity style={styles.searchButton} onPress={handleManualSearch}>
                            <Text style={styles.searchButtonText}>Search</Text>
                        </TouchableOpacity>
                    </View>
                    {/* --- End Manual Input Section --- */}


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
                            clearer photo, adjust lighting, or use manual search.</Text>
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
        fontSize: 14,
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
    manualInputContainer: {
        backgroundColor: '#f0f8ff', // Light blue background for manual section
        padding: 15,
        borderRadius: 10,
        marginTop: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#d0e0ff',
    },
    manualInputTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: '#0056b3',
    },
    inputLabel: {
        fontSize: 15,
        fontWeight: '600',
        marginTop: 10,
        marginBottom: 5,
        color: '#333',
    },
    textInput: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 10,
        backgroundColor: '#fff',
    },
    pickerContainer: {
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 10,
        overflow: 'hidden', // Ensures border radius clips picker content
        backgroundColor: '#fff',
    },
    picker: {
        height: 50, // Standard height for picker
        width: '100%',
    },
    searchButton: {
        backgroundColor: '#007bff',
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    noMatchText: {
        fontStyle: 'italic',
        color: '#555',
        marginTop: 10, // Add some margin
    },
});

export default ResultsScreen;