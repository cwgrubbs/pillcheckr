import {StackNavigationProp} from '@react-navigation/stack';
import {RouteProp} from '@react-navigation/native';

// Define the parameters for each screen in your stack navigator
export type RootStackParamList = {
    HomeScreen: undefined;
    CameraScreen: undefined;
    ResultsScreen: { imageUri: string };
};

export type ResultsScreenProps = {
    navigation: StackNavigationProp<RootStackParamList, "ResultsScreen">;
    route: RouteProp<RootStackParamList, "ResultsScreen">;
};


// Optionally, you can also define other ParamList types if you have multiple navigators
// export type AuthStackParamList = {
//     LoginScreen: undefined;
//     SignupScreen: undefined;
// };
