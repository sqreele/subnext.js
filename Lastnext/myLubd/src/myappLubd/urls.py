from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import RoomViewSet, TopicViewSet, JobViewSet, PropertyViewSet, UserProfileViewSet
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import CustomSessionView 
from .views import log_view
# Set the app name correctly
app_name = 'myappLubd'

# Create a router and register viewsets
router = DefaultRouter()
router.register(r'rooms', RoomViewSet)
router.register(r'topics', TopicViewSet)
router.register(r'jobs', JobViewSet)
router.register(r'properties', PropertyViewSet)
router.register(r'user-profiles', UserProfileViewSet)

# Define the URL patterns
urlpatterns = [
    # Include API routes under the 'api/' path
    path('api/', include(router.urls)),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/session/', CustomSessionView.as_view(), name='auth_session'),
    path('api/auth/_log', log_view, name='log_view'),
    path('api/auth/check/', views.auth_check, name='auth_check'),
   # path('api/auth/register/', views.RegisterView.as_view(), name='register'),
    path('api/auth/register/', views.register_user, name='register'),
    path('auth/signin/', views.login_user, name='login'),
  

 
    
]
