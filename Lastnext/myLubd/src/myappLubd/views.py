from rest_framework import viewsets
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from .models import Room, Topic, Job, Property, UserProfile, Property
from .serializers import (
    RoomSerializer, 
    TopicSerializer, 
    JobSerializer, 
    PropertySerializer,
    UserProfileSerializer,
    UserRegistrationSerializer
)
import logging

logger = logging.getLogger(__name__)

class RoomViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    queryset = Room.objects.all()
    serializer_class = RoomSerializer

class TopicViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    queryset = Topic.objects.all()
    serializer_class = TopicSerializer

class JobViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    queryset = Job.objects.all()
    serializer_class = JobSerializer
    lookup_field = 'job_id'  # Use job_id instead of pk for lookups

    def get_object(self):
        """
        Override get_object to use job_id for lookups
        """
        queryset = self.get_queryset()
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}
        
        obj = get_object_or_404(queryset, **filter_kwargs)
        self.check_object_permissions(self.request, obj)
        return obj

    @action(detail=True, methods=['patch'])
    def update_status(self, request, job_id=None):
        """
        Custom action to update job status
        """
        job = self.get_object()
        status_value = request.data.get('status')
        
        if status_value and status_value not in dict(Job.STATUS_CHOICES):
            return Response(
                {"detail": "Invalid status value."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        job.status = status_value
        job.save()
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        """
        Override retrieve to add custom logging
        """
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            logger.info(f"Retrieved job: {instance.job_id}")
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error retrieving job: {str(e)}")
            return Response(
                {"detail": "Job not found"},
                status=status.HTTP_404_NOT_FOUND
            )

class UserProfileViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer

    def get_queryset(self):
        queryset = UserProfile.objects.all().prefetch_related('properties')
        
        # Filter by position
        position = self.request.query_params.get('position', None)
        if position:
            queryset = queryset.filter(positions__icontains=position)
            
        return queryset

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user's profile"""
        profile = get_object_or_404(UserProfile, user=request.user)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_property(self, request, pk=None):
        """Add property to user profile"""
        profile = self.get_object()
        property_id = request.data.get('property_id')
        
        if not property_id:
            return Response(
                {'error': 'property_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        property = get_object_or_404(Property, id=property_id)
        profile.properties.add(property)
        
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def remove_property(self, request, pk=None):
        """Remove property from user profile"""
        profile = self.get_object()
        property_id = request.data.get('property_id')
        
        if not property_id:
            return Response(
                {'error': 'property_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        property = get_object_or_404(Property, id=property_id)
        profile.properties.remove(property)
        
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

class UserProfileViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer

    def get_queryset(self):
        queryset = UserProfile.objects.all().prefetch_related('properties')
        
        # Filter by position
        position = self.request.query_params.get('position', None)
        if position:
            queryset = queryset.filter(positions__icontains=position)
            
        return queryset

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user's profile"""
        profile = get_object_or_404(UserProfile, user=request.user)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_property(self, request, pk=None):
        """Add property to user profile"""
        profile = self.get_object()
        property_id = request.data.get('property_id')
        
        if not property_id:
            return Response(
                {'error': 'property_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        property = get_object_or_404(Property, id=property_id)
        profile.properties.add(property)
        
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def remove_property(self, request, pk=None):
        """Remove property from user profile"""
        profile = self.get_object()
        property_id = request.data.get('property_id')
        
        if not property_id:
            return Response(
                {'error': 'property_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        property = get_object_or_404(Property, id=property_id)
        profile.properties.remove(property)
        
        serializer = self.get_serializer(profile)
        return Response(serializer.data)
class PropertyViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    queryset = Property.objects.all()
    serializer_class = PropertySerializer
    
    def get_queryset(self):
        queryset = Property.objects.all()
        
        # Filter by price range
        min_price = self.request.query_params.get('min_price', None)
        max_price = self.request.query_params.get('max_price', None)
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
            
        # Filter by location
        location = self.request.query_params.get('location', None)
        if location:
            queryset = queryset.filter(location__icontains=location)
            
        return queryset

    @action(detail=True, methods=['post'])
    def add_to_profile(self, request, pk=None):
        property = self.get_object()
        user_profile = get_object_or_404(UserProfile, user=request.user)
        user_profile.properties.add(property)
        return Response({'status': 'property added to profile'})
    
class CustomSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        # Get user profile
        try:
            profile = user.profile  # Assuming you have a related profile model
            return Response({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_staff": user.is_staff,
                "profile": {
                    "properties": profile.properties,
                    "positions": profile.positions,
                    "profile_image": profile.profile_image if hasattr(profile, 'profile_image') else None
                }
            })
        except:
            return Response({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_staff": user.is_staff,
            })
        
from django.views.decorators.csrf import csrf_exempt       
@csrf_exempt
def log_view(request):
    """
    Handles requests to the /api/auth/_log endpoint.
    Logs incoming requests or returns a simple response.
    """
    if request.method == "POST":
        print("Log received:", request.body.decode('utf-8'))
        return JsonResponse({"message": "Log received"}, status=200)
    return JsonResponse({"error": "Method not allowed"}, status=405)

class UserSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "profile_image": getattr(user, 'profile_image', None),  # Optional field
        })
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.decorators import login_required
from django.middleware.csrf import get_token
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import AnonymousUser
@api_view(['GET'])
@permission_classes([AllowAny])
def auth_check(request):
    try:
        csrf_token = get_token(request)
        
        if request.user.is_authenticated:
            refresh = RefreshToken.for_user(request.user)
            return Response({
                'authenticated': True,
                'user': {
                    'username': request.user.username,
                },
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                },
                'csrf_token': csrf_token
            })
        
        return Response({
            'authenticated': False,
            'csrf_token': csrf_token
        }, status=200)
    
    except Exception as e:
        print(f"Auth check error: {str(e)}")
        return Response({
            'authenticated': False,
            'error': 'Authentication error occurred'
        }, status=200)

# Add this for token refresh
@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    refresh_token = request.data.get('refresh')
    try:
        refresh = RefreshToken(refresh_token)
        return Response({
            'access': str(refresh.access_token),
        })
    except Exception as e:
        return Response({'error': 'Invalid refresh token'}, status=401)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_job(request):
    if isinstance(request.user, AnonymousUser):
        print("Anonymous User detected in the request")
    else:
        print(f"Authenticated User: {request.user.username}")

    serializer = JobSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        job = serializer.save()
        return Response(JobSerializer(job).data, status=201)
    return Response(serializer.errors, status=400)
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny
class RegisterView(APIView):
   authentication_classes = []
   permission_classes = [AllowAny]

   def post(self, request):
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': serializer.data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .serializers import UserRegistrationSerializer,LoginSerializer
@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'username': user.username,
                'email': user.email
            }
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = authenticate(
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password']
        )
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'username': user.username,
                    'email': user.email
                }
            })
        return Response(
            {'error': 'Invalid credentials'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
@api_view(['GET'])
def auth_check(request):
    if request.user.is_authenticated:
        return Response({
            'isAuthenticated': True,
            'user': {
                'id': request.user.id,
                'username': request.user.username,
                'email': request.user.email
            }
        })
    return Response({'isAuthenticated': False})