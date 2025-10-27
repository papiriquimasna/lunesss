from django.db import models
from django.contrib.auth.models import AbstractUser
import os


def user_avatar_path(instance, filename):
    """Genera la ruta para guardar el avatar del usuario"""
    ext = filename.split('.')[-1]
    filename = f'avatar_{instance.id}.{ext}'
    return os.path.join('avatars/', filename)


# Create your models here.
class User(AbstractUser):
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30)
    avatar = models.ImageField(
        upload_to=user_avatar_path,
        null=True,
        blank=True,
        help_text="Avatar del usuario (opcional)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.email
    
    @property
    def avatar_url(self):
        """Retorna la URL del avatar o None si no tiene"""
        if self.avatar and hasattr(self.avatar, 'url'):
            return self.avatar.url
        return None